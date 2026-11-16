/** One sentence that says what pressing Build will do with the current options. */
export function flowText(ask: boolean, plan: boolean, expand: boolean): string {
  const steps = [
    ask && "ask a few quick questions",
    plan && "show you a plan to edit",
    "build the site",
    expand && "expand it into a fuller version",
  ].filter(Boolean) as string[];
  return `When you press Build, the AI will ${steps.slice(0, -1).join(", ")}${steps.length > 1 ? " and " : ""}${steps[steps.length - 1]}.`;
}
