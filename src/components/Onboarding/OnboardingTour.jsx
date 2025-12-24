import { useState, useLayoutEffect } from "react";
import "./OnboardingTour.css";

const STEPS = [
  {
    target: ".node-sidebar",
    title: "📦 Node Library",
    content:
      "Drag & drop nodes from here to build your workflow. Browse categories like Triggers, Actions, Logic, and AI nodes.",
    placement: "right",
  },
  {
    target: ".templates-toggle",
    title: "📋 Workflow Templates",
    content:
      "Click here to access pre-built workflow templates. Quickly load example automations to learn or customize for your needs.",
    placement: "right",
  },
  {
    target: ".react-flow",
    title: "🎨 Workflow Canvas",
    content:
      "This is your workspace. Drop nodes here, connect them with edges, and build powerful automations. Right-click for options.",
    placement: "center",
  },
  {
    target: ".execution-panel",
    title: "📊 Logs & Results",
    content:
      "See real-time execution logs here. The Output tab shows final results, and Artifacts stores generated files.",
    placement: "left",
  },
  {
    target: ".toolbar",
    title: "📁 Workflow Management",
    content:
      "Name your workflow, save it, or import/export. Use the dropdown to switch between saved workflows.",
    placement: "bottom",
  },
  {
    target: ".exec-btn-group",
    title: "▶️ Run Controls",
    content:
      "Click Run to execute your workflow. Use Debug mode to step through nodes one by one and inspect data.",
    placement: "top",
  },
  {
    target: ".ai-controls-panel",
    title: "🤖 AI Controls",
    content:
      "Chat with the Overseer AI, manage your local LLM models in the model manager. Keep track of privacy Leaks in the privacy manager.",
    placement: "top",
  },
  {
    target: ".overseer-btn",
    title: "👁️ The Overseer",
    content:
      "Your AI assistant! Ask it to build workflows for you, explain nodes, or debug errors. It understands your entire canvas.",
    placement: "top",
  },
];

export default function OnboardingTour({ isActive, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!isActive) return;

    // Find target
    const step = STEPS[currentStep];
    const element = document.querySelector(step.target);

    if (element) {
      const r = element.getBoundingClientRect();
      setRect(r);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      // Fallback if element not found (e.g. dynamic elements)
      console.warn(`Tour target not found: ${step.target}`);
      // Skip or default to center
      setRect({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 150,
        width: 300,
        height: 200,
      });
    }
  }, [isActive, currentStep, onComplete]);

  if (!isActive || !rect) return null;

  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Calculate Popover Position
  let popoverStyle = {};
  const gap = 20;

  switch (step.placement) {
    case "right":
      popoverStyle = { top: rect.top, left: rect.right + gap };
      break;
    case "left":
      popoverStyle = {
        top: rect.top,
        right: window.innerWidth - rect.left + gap,
      };
      break;
    case "bottom":
      popoverStyle = { top: rect.bottom + gap, left: rect.left };
      break;
    case "top":
      popoverStyle = {
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left,
      };
      break;
    case "top-left":
      popoverStyle = {
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left,
      };
      break;
    case "bottom-left":
      popoverStyle = { top: rect.bottom + gap, left: rect.left };
      break;
    default: // center
      popoverStyle = {
        top: rect.top + rect.height / 2 - 100,
        left: rect.left + rect.width / 2 - 160,
      };
  }

  // Ensure within viewport
  // (Simple clamp for now, can be improved)

  return (
    <div className="tour-overlay">
      {/* Spotlight Effect using big borders */}
      <div
        className="tour-spotlight"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />

      <div className="tour-popover" style={popoverStyle}>
        <h3>{step.title}</h3>
        <p>{step.content}</p>
        <div className="tour-actions">
          <button className="btn-skip" onClick={handleSkip}>
            Skip
          </button>
          <div className="tour-nav-buttons">
            <button
              className="btn-prev"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              ← Prev
            </button>
            <div className="tour-dots">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`tour-dot ${i === currentStep ? "active" : ""}`}
                />
              ))}
            </div>
            <button className="btn-next" onClick={handleNext}>
              {currentStep === STEPS.length - 1 ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
