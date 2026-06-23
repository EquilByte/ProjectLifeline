/**
 * Project Lifeline - Main App Controller
 */

window.updateLogicCanvas = (stepId, state) => {
    const sequence = ['vad', 'stt', 'nlp', 'gis', 'fsm', 'llm', 'tts', 'out'];
    
    // Reset pipeline when going back to the start
    if (stepId === 'vad' && state === 'active') {
        document.querySelectorAll('.logic-node').forEach(n => { n.classList.remove('active', 'completed'); });
        document.querySelectorAll('.logic-line').forEach(l => { l.classList.remove('active'); });
    }

    const node = document.getElementById(`node-${stepId}`);
    if (!node) return;

    const nodeIndex = sequence.indexOf(stepId);
    const prevLine = nodeIndex > 0 ? document.getElementById(`line-${nodeIndex}`) : null;

    if (state === 'active') {
        node.classList.remove('completed');
        node.classList.add('active');
        if (prevLine) prevLine.classList.add('active');

        // Mark all previous nodes as completed if jumping ahead
        for (let i = 0; i < nodeIndex; i++) {
            const prevNode = document.getElementById(`node-${sequence[i]}`);
            if (prevNode && !prevNode.classList.contains('completed')) {
                prevNode.classList.remove('active');
                prevNode.classList.add('completed');
            }
            const line = i > 0 ? document.getElementById(`line-${i}`) : null;
            if (line) line.classList.remove('active');
        }
    } else if (state === 'completed') {
        node.classList.remove('active');
        node.classList.add('completed');
        if (prevLine) prevLine.classList.remove('active');
    } else if (state === 'idle') {
        node.classList.remove('active', 'completed');
        if (prevLine) prevLine.classList.remove('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Intro Modal Handling & 5-Second Delay Countdown
    const introModal = document.getElementById('intro-modal');
    const btnCloseIntro = document.getElementById('btn-close-intro');
    if (introModal && btnCloseIntro) {
        let timeLeft = 5;
        const countdownTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                btnCloseIntro.innerText = `Acknowledge (${timeLeft}s)`;
            } else {
                clearInterval(countdownTimer);
                btnCloseIntro.removeAttribute('disabled');
                btnCloseIntro.innerText = "Acknowledge";
                btnCloseIntro.style.background = "linear-gradient(135deg, #2563eb, #1d4ed8)";
                btnCloseIntro.style.cursor = "pointer";
                btnCloseIntro.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.2)";
                
                btnCloseIntro.addEventListener('click', () => {
                    introModal.classList.add('hidden');
                });
            }
        }, 1000);
    }

    // UI Elements
    const btnStartCall = document.getElementById('start-call-btn');
    const btnEndCall = document.getElementById('end-call-btn');
    const transcriptContainer = document.getElementById('transcript-container');
    const fsmStateLabel = document.getElementById('ui-fsm-state');
    const severityBadge = document.getElementById('ui-severity-badge');
    const locationLabel = document.getElementById('ui-location');
    const typeLabel = document.getElementById('ui-incident-type');
    const casualtiesLabel = document.getElementById('ui-casualties');
    const summaryLabel = document.getElementById('ui-summary');
    
    // New UI Elements for Overhaul
    const reportContent = document.getElementById('ui-report-content');
    const phoneStatus = document.getElementById('phone-status');
    const phoneTimer = document.getElementById('phone-timer');
    const phoneMic = document.querySelector('.phone-mic');
    
    let callTimerInterval = null;
    let callSeconds = 0;

    // Systems
    const llm = new GeminiLLM();
    const mapSystem = new MapSystem('map');
    let audio = new AudioSystem();
    let fsm = null;

    // UI Callbacks for FSM
    const uiCallbacks = {
        onStateChange: (state) => {
            fsmStateLabel.innerText = state;
            phoneStatus.innerText = state === FSMState.LISTENING ? "Listening..." : "Processing...";
            
            if (state === FSMState.HIL_HANDOFF) {
                audio.stopListening(true);
                fsmStateLabel.innerText = "Dispatcher PTT active...";
            }

            if (state === FSMState.LISTENING) {
                phoneMic.classList.add('active');
            } else {
                phoneMic.classList.remove('active');
            }

            if (state === FSMState.END || state === FSMState.HIL_HANDOFF) {
                btnStartCall.classList.remove('hidden');
                btnEndCall.classList.add('hidden');
                clearInterval(callTimerInterval);
                phoneStatus.innerText = state === FSMState.END ? "Call Ended" : "Transferred to Human";
                phoneMic.classList.remove('active');
            }
        },
        addAiMessage: (text) => {
            addMessage('ai', text);
        },
        addCallerMessage: (text) => {
            addMessage('caller', text);
        },
        onSlotsUpdated: async (slots) => {
            if (slots.incident_type && slots.incident_type.value) {
                typeLabel.innerText = `${slots.incident_type.value} (${(slots.incident_type.confidence*100).toFixed(0)}%)`;
            }
            if (slots.casualties && slots.casualties.value) {
                casualtiesLabel.innerText = slots.casualties.value;
                if (slots.casualties.is_critical) {
                    casualtiesLabel.style.color = 'var(--critical-text)';
                    casualtiesLabel.style.fontWeight = 'bold';
                }
            }
            const loc = slots.location;
            let locStr = [loc.house_number, loc.street, loc.intersection, loc.landmark, loc.ward_district].filter(Boolean).join(', ');
            
            if (loc.w3w) locStr = locStr ? `${locStr} (W3W: ${loc.w3w})` : `W3W: ${loc.w3w}`;
            if (loc.plus_code) locStr = locStr ? `${locStr} (Plus Code: ${loc.plus_code})` : `Plus Code: ${loc.plus_code}`;
            
            if (locStr || loc.latitude) {
                locationLabel.innerText = locStr || "Tọa độ GPS";
                await mapSystem.updateLocation(loc);
            }
        },
        onSeverityUpdated: (severity) => {
            severityBadge.innerText = severity;
            severityBadge.className = 'badge';
            if (severity === 'HIGH') severityBadge.classList.add('badge-critical');
            else if (severity === 'MEDIUM') severityBadge.classList.add('badge-moderate');
            else severityBadge.classList.add('badge-unknown');

            if (summaryLabel) {
                summaryLabel.innerText = `Severity: ${severity}. Auto-dispatch recommendations active.`;
            }
        },
        triggerDispatch: (slots, transcriptText, severity) => {
            const dispatch = { police: false, fire: false, ems: false };
            
            // 1. LLM-provided recommendations
            if (slots.dispatch) {
                if (slots.dispatch.police) dispatch.police = true;
                if (slots.dispatch.fire) dispatch.fire = true;
                if (slots.dispatch.ems) dispatch.ems = true;
            }
            
            // 2. Programmatic rule fallbacks
            const typeValue = (slots.incident_type?.value || "").toLowerCase();
            const trans = (transcriptText || "").toLowerCase();
            
            const hasFire = trans.includes("cháy") || trans.includes("lửa") || typeValue.includes("cháy") || typeValue.includes("hỏa hoạn");
            const hasAccident = trans.includes("tai nạn") || trans.includes("tông") || trans.includes("va chạm") || typeValue.includes("tai nạn");
            const hasCrime = trans.includes("súng") || trans.includes("bắn") || trans.includes("cướp") || trans.includes("trộm") || trans.includes("đánh") || trans.includes("bạo lực") || trans.includes("tấn công") || typeValue.includes("cướp") || typeValue.includes("tấn công") || typeValue.includes("bạo lực");
            const hasMedical = trans.includes("thương") || trans.includes("máu") || trans.includes("ngất") || trans.includes("đột quỵ") || trans.includes("đau tim") || trans.includes("bệnh") || trans.includes("khó thở") || (slots.casualties?.value && slots.casualties.value !== "Không" && slots.casualties.value !== "None");

            if (hasFire) dispatch.fire = true;
            if (hasAccident) {
                dispatch.police = true;
                dispatch.ems = true;
            }
            if (hasCrime) dispatch.police = true;
            if (hasMedical) dispatch.ems = true;
            
            // If severity is HIGH/MEDIUM but nothing is dispatched, default to police
            if ((severity === "HIGH" || severity === "MEDIUM") && !dispatch.police && !dispatch.fire && !dispatch.ems) {
                dispatch.police = true;
            }

            // UI feedback: Reset all and apply active class to dispatched ones
            const btnPolice = document.getElementById('btn-police');
            const btnFire = document.getElementById('btn-fire');
            const btnEms = document.getElementById('btn-ems');

            btnPolice.classList.remove('active-dispatch');
            btnFire.classList.remove('active-dispatch');
            btnEms.classList.remove('active-dispatch');
            btnPolice.style.opacity = '';
            btnFire.style.opacity = '';
            btnEms.style.opacity = '';

            const dispatchedList = [];
            if (dispatch.police) {
                btnPolice.classList.add('active-dispatch');
                dispatchedList.push("Police");
            }
            if (dispatch.fire) {
                btnFire.classList.add('active-dispatch');
                dispatchedList.push("Fire");
            }
            if (dispatch.ems) {
                btnEms.classList.add('active-dispatch');
                dispatchedList.push("EMS");
            }

            // Brief visual blink feedback
            setTimeout(() => {
                if (dispatch.police) { btnPolice.style.opacity = '0.5'; setTimeout(() => btnPolice.style.opacity = '', 150); }
                if (dispatch.fire) { btnFire.style.opacity = '0.5'; setTimeout(() => btnFire.style.opacity = '', 150); }
                if (dispatch.ems) { btnEms.style.opacity = '0.5'; setTimeout(() => btnEms.style.opacity = '', 150); }
            }, 50);

            // Add a system message
            if (dispatchedList.length > 0) {
                addMessage('ai', `[Hệ thống] Tự động điều động lực lượng: ${dispatchedList.join(', ')} (Mức độ: ${severity}).`);
            } else {
                addMessage('ai', `[Hệ thống] Chưa đủ thông tin để tự động điều động lực lượng.`);
            }

            return dispatch;
        },
        onReportStart: () => {
            reportContent.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="loader-2" class="animate-spin"></i>
                    <p>AI is generating the official emergency report...</p>
                </div>
            `;
            lucide.createIcons();
        },
        onReportGenerated: (markdownReport) => {
            if (window.marked) {
                reportContent.innerHTML = marked.parse(markdownReport);
            } else {
                reportContent.innerText = markdownReport; // Fallback
            }
        },
        onHandoff: (session, SOP_DB) => {
            document.getElementById('panel-reports').classList.add('hidden');
            document.getElementById('panel-hil').classList.remove('hidden');

            const typeValue = (session.slots.incident_type && session.slots.incident_type.value) ? session.slots.incident_type.value.toLowerCase() : "";
            const transcriptText = (session.transcript || "").toLowerCase();
            
            const hasFire = transcriptText.includes("cháy") || transcriptText.includes("lửa") || typeValue.includes("cháy");
            const hasTrapped = transcriptText.includes("kẹt") || transcriptText.includes("không ra được");
            const hasAccident = transcriptText.includes("tai nạn") || transcriptText.includes("tông") || typeValue.includes("tai nạn");
            const hasShooter = transcriptText.includes("súng") || transcriptText.includes("bắn") || transcriptText.includes("giết");
            const hasDomestic = transcriptText.includes("đánh") || transcriptText.includes("bạo lực");
            
            let flowKey = "generic";
            if (hasShooter) flowKey = "active_shooter";
            else if (hasDomestic) flowKey = "domestic_violence";
            else if (hasAccident && hasFire) flowKey = "traffic_accident_fire";
            else if (hasFire && hasTrapped) flowKey = "fire_trapped";
            else if (hasAccident) flowKey = "traffic_accident";
            else if (hasFire) flowKey = "fire";

            const sop = SOP_DB[flowKey];
            let html = `<h3>SOP: ${sop.name}</h3><ul>`;
            sop.steps.forEach(step => {
                html += `<li><strong>Hỏi/Hướng dẫn:</strong> ${step.ask}<br><span class="text-muted">✔ Nếu có: ${step.if_yes} <br>✖ Nếu không: ${step.if_no}</span></li>`;
            });
            html += `</ul>`;
            
            document.getElementById('ui-hil-sop').innerHTML = html;

            audio.stopListening(true); // Hard stop continuous listening

            // Wire Dispatcher HIL Mic
            const btnHilMic = document.getElementById('hil-mic-btn');
            if (btnHilMic) {
                // Remove old listeners if any to prevent duplicates
                const newBtn = btnHilMic.cloneNode(true);
                btnHilMic.parentNode.replaceChild(newBtn, btnHilMic);
                
                newBtn.addEventListener('mousedown', () => {
                    newBtn.classList.add('recording');
                    audio.onSpeechResult = (text) => {
                        addMessage('ai', text);
                        session.transcript += `\n[ĐIỀU PHỐI VIÊN]: ${text}`;
                    };
                    audio.startListening(60000); // Wait up to 60s for speech
                });
                const stopHilMic = () => {
                    newBtn.classList.remove('recording');
                    audio.stopListening(true);
                };
                newBtn.addEventListener('mouseup', stopHilMic);
                newBtn.addEventListener('mouseleave', stopHilMic);
            }

            // Wire Caller HIL Mic
            const phoneMicBtn = document.querySelector('.phone-mic');
            if (phoneMicBtn) {
                const newPhoneMic = phoneMicBtn.cloneNode(true);
                phoneMicBtn.parentNode.replaceChild(newPhoneMic, phoneMicBtn);
                
                newPhoneMic.style.cursor = 'pointer';
                
                // Add hint if missing
                if (!newPhoneMic.parentElement.querySelector('.phone-mic-hint')) {
                    const hint = document.createElement('div');
                    hint.innerText = "Hold to Talk";
                    hint.style.fontSize = "0.75rem";
                    hint.style.color = "#a1a1aa";
                    hint.style.textAlign = "center";
                    hint.style.marginTop = "8px";
                    hint.className = "phone-mic-hint";
                    newPhoneMic.parentElement.appendChild(hint);
                }

                newPhoneMic.addEventListener('mousedown', () => {
                    newPhoneMic.classList.add('recording');
                    audio.onSpeechResult = (text) => {
                        addMessage('user', text);
                        session.transcript += `\n[NGƯỜI GỌI]: ${text}`;
                    };
                    audio.startListening(60000);
                });
                const stopCallerMic = () => {
                    newPhoneMic.classList.remove('recording');
                    audio.stopListening(true);
                };
                newPhoneMic.addEventListener('mouseup', stopCallerMic);
                newPhoneMic.addEventListener('mouseleave', stopCallerMic);
            }
        }
    };

    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = `chat-message ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = `<i data-lucide="${role === 'ai' ? 'bot' : 'user'}"></i>`;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerText = text;
        
        div.appendChild(avatar);
        div.appendChild(bubble);
        transcriptContainer.appendChild(div);
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
        lucide.createIcons();
    }

    // Call Control
    btnStartCall.addEventListener('click', async () => {
        if (!llm.hasAuth()) {
            alert("Error: Auth Signature is missing from the source code.");
            return;
        }

        // --- MICROPHONE PERSISTENCE HACK FOR FILE:// PROTOCOL ---
        // Browsers prompt for microphone permission every time SpeechRecognition starts if running locally via file://
        // To bypass this, we grab a dummy continuous media stream. While this stream is active, Chrome will not re-prompt!
        if (window.location.protocol === 'file:') {
            try {
                window._dummyAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log("[HACK] Dummy media stream acquired to suppress file:// mic prompts.");
            } catch (e) {
                console.warn("[HACK] Dummy stream failed:", e);
            }
        }

        // --- SILENT AUTOPLAY UNLOCKER ---
        // Browsers block async audio.play() if it happens too long after a click.
        // Playing a tiny silent audio file synchronously on click "unlocks" the AudioContext for the entire session.
        const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIAD+////8vPz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/P//+7kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        silentAudio.play().catch(e => console.warn("Unlocker blocked:", e));
        
        transcriptContainer.innerHTML = ''; // Clear chat
        reportContent.innerHTML = `
            <div class="empty-state">
                <i data-lucide="file-check-2"></i>
                <p>Report will be generated automatically via Gemini AI when the call concludes.</p>
            </div>
        `;
        lucide.createIcons();
        
        severityBadge.innerText = "UNKNOWN";
        severityBadge.className = "badge badge-unknown";
        typeLabel.innerText = "Pending...";
        locationLabel.innerText = "Unknown";
        casualtiesLabel.innerText = "None reported";
        casualtiesLabel.style.color = '';
        
        btnStartCall.classList.add('hidden');
        btnEndCall.classList.remove('hidden');
        document.getElementById('panel-hil').classList.add('hidden');
        document.getElementById('panel-reports').classList.remove('hidden');
        
        // Reset dispatch buttons visually
        ['btn-police', 'btn-fire', 'btn-ems'].forEach(id => {
            const btn = document.getElementById(id);
            btn.classList.remove('active-dispatch');
            btn.style.opacity = '';
        });
        
        phoneStatus.innerText = "Connecting...";
        callSeconds = 0;
        phoneTimer.innerText = "00:00";
        clearInterval(callTimerInterval);
        callTimerInterval = setInterval(() => {
            callSeconds++;
            const m = Math.floor(callSeconds / 60).toString().padStart(2, '0');
            const s = (callSeconds % 60).toString().padStart(2, '0');
            phoneTimer.innerText = `${m}:${s}`;
        }, 1000);

        audio = new AudioSystem();
        audio.unlockAudioContext().catch(e => console.warn("AudioContext unlock failed:", e));
        
        const savedOpenAIKey = localStorage.getItem('openai_api_key');
        if (savedOpenAIKey) {
            audio.setOpenAIKey(savedOpenAIKey);
        }
        fsm = new FSMEngine(llm, audio, uiCallbacks);
        fsm.start();
    });

    btnEndCall.addEventListener('click', () => {
        audio.stopListening(true);
        if (fsm) {
            const prevState = fsm.state;
            fsm.stop();
            
            // If the call was actively running, manually trigger the report generation
            if (prevState !== FSMState.END && prevState !== FSMState.HIL_HANDOFF) {
                if (uiCallbacks.onReportStart) uiCallbacks.onReportStart();
                
                llm.generateEmergencyReport(fsm.session.transcript, fsm.session.slots).then(report => {
                    if (uiCallbacks.onReportGenerated) uiCallbacks.onReportGenerated(report);
                }).catch(e => {
                    if (uiCallbacks.onReportGenerated) uiCallbacks.onReportGenerated("Lỗi: Không thể tạo báo cáo do hệ thống bị ngắt.");
                });
            }
        }
        btnStartCall.classList.remove('hidden');
        btnEndCall.classList.add('hidden');
        clearInterval(callTimerInterval);
        phoneStatus.innerText = "Call Ended";
        phoneMic.classList.remove('active');
    });

    // Make Dispatch Buttons Interactive
    ['btn-police', 'btn-fire', 'btn-ems'].forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
            if (fsm && (fsm.session.is_running || fsm.state === FSMState.HIL_HANDOFF)) {
                const btn = document.getElementById(id);
                const isAlreadyActive = btn.classList.contains('active-dispatch');
                
                if (isAlreadyActive) {
                    btn.classList.remove('active-dispatch');
                    btn.style.opacity = '';
                    addMessage('ai', `[Hệ thống] Đã hủy điều động thủ công ${id.replace('btn-', '').toUpperCase()}.`);
                    fsm.session.transcript += `\n[HỆ THỐNG]: Đã hủy điều động thủ công ${id.replace('btn-', '').toUpperCase()}.`;
                } else {
                    btn.classList.add('active-dispatch');
                    btn.style.opacity = '';
                    addMessage('ai', `[Hệ thống] Đã điều động thủ công ${id.replace('btn-', '').toUpperCase()}.`);
                    fsm.session.transcript += `\n[HỆ THỐNG]: Đã điều động thủ công ${id.replace('btn-', '').toUpperCase()}.`;
                }

                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = 'scale(1)', 100);
            }
        });
    });

    // HIL Controls
    const hilMicBtn = document.getElementById('hil-mic-btn');
    const hilEndCallBtn = document.getElementById('hil-end-call-btn');
    let isHilRecording = false;

    hilMicBtn.addEventListener('mousedown', () => {
        if (!fsm || fsm.state !== FSMState.HIL_HANDOFF) return;
        isHilRecording = true;
        hilMicBtn.classList.add('recording');
        hilMicBtn.querySelector('span').innerText = "Recording...";
        audio.startListening(60000);
    });

    const stopHilRecording = () => {
        if (!isHilRecording || !fsm) return;
        isHilRecording = false;
        hilMicBtn.classList.remove('recording');
        hilMicBtn.querySelector('span').innerText = "Hold to Talk";
        audio.stopListening();
    };

    hilMicBtn.addEventListener('mouseup', stopHilRecording);
    hilMicBtn.addEventListener('mouseleave', stopHilRecording);

    hilEndCallBtn.addEventListener('click', async () => {
        if (fsm && fsm.state === FSMState.HIL_HANDOFF) {
            document.getElementById('panel-hil').classList.add('hidden');
            document.getElementById('panel-reports').classList.remove('hidden');
            
            fsm.state = FSMState.END;
            await fsm.generateFinalReport();
            
            btnStartCall.classList.remove('hidden');
            btnEndCall.classList.add('hidden');
            clearInterval(callTimerInterval);
            phoneStatus.innerText = "Call Ended";
        }
    });

    // Navigation Toggles for Testing UI
    const navAiMode = document.getElementById('nav-ai-mode');
    const navHilMode = document.getElementById('nav-hil-mode');
    
    if (navAiMode && navHilMode) {
        navAiMode.addEventListener('click', () => {
            navAiMode.classList.add('active');
            navHilMode.classList.remove('active');
            document.getElementById('panel-hil').classList.add('hidden');
            document.getElementById('panel-reports').classList.remove('hidden');
        });
        
        navHilMode.addEventListener('click', () => {
            navHilMode.classList.add('active');
            navAiMode.classList.remove('active');
            document.getElementById('panel-reports').classList.add('hidden');
            document.getElementById('panel-hil').classList.remove('hidden');
        });
    }

    // Toggle Phone Visibility
    const btnTogglePhone = document.getElementById('btn-toggle-phone');
    const mockPhoneContainer = document.querySelector('.mock-phone-container');
    
    if (btnTogglePhone && mockPhoneContainer) {
        btnTogglePhone.addEventListener('click', () => {
            mockPhoneContainer.classList.toggle('hidden');
            btnTogglePhone.classList.toggle('active');
        });
    }

    // Export Case Data
    const btnExportJson = document.getElementById('btn-export-json');
    const btnExportMd = document.getElementById('btn-export-md');
    
    const getCaseData = () => {
        if (!fsm || !fsm.session) {
            alert("No active or completed case to export.");
            return null;
        }
        return {
            timestamp: new Date().toISOString(),
            final_state: fsm.state,
            severity: fsm.session.severity,
            slots: fsm.session.slots,
            transcript: fsm.session.transcript,
            report: reportContent.innerText
        };
    };

    const downloadFile = (content, filename, mimeType) => {
        const dataStr = `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            const data = getCaseData();
            if (!data) return;
            downloadFile(JSON.stringify(data, null, 2), `lifeline_case_${Date.now()}.json`, 'text/json');
        });
    }

    if (btnExportMd) {
        btnExportMd.addEventListener('click', () => {
            const data = getCaseData();
            if (!data) return;
            
            let mdContent = `# Lifeline Case Export\n\n`;
            mdContent += `**Timestamp:** ${data.timestamp}\n`;
            mdContent += `**Final State:** ${data.final_state}\n`;
            mdContent += `**Severity:** ${data.severity}\n\n`;
            mdContent += `## Extracted Data (Slots)\n`;
            mdContent += "```json\n" + JSON.stringify(data.slots, null, 2) + "\n```\n\n";
            mdContent += `## Transcript\n`;
            mdContent += `${data.transcript || "No transcript available."}\n\n`;
            mdContent += `## Final Report\n`;
            mdContent += `${data.report || "No report generated."}\n`;
            
            downloadFile(mdContent, `lifeline_case_${Date.now()}.md`, 'text/markdown');
        });
    }
});
