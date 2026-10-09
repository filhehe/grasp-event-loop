# Grasp Event Loop

Grasp Event Loop shows the order in which JavaScript runs code. The editor, the console, and the event loop diagram share one screen: write a snippet, step through it, and see where each task goes.

This is how you work through the interview question “what does this code log” — by watching a task move through the stack and the queues.

## One screen instead of a diagram in your head

Code and the console are on the left. On the right are the five zones the program moves through:

- **Call Stack** — synchronous code. A function call is pushed on top and popped when the function returns.
- **Web API** — timers that wait outside the stack and do not block the rest of the code.
- **Event Loop** — the moment the stack is empty and it is time to take the next task.
- **Macrotask Queue** — `setTimeout` and `setInterval` callbacks. One task is taken from here per turn.
- **Microtask Queue** — promises and `queueMicrotask`. They run right after the current code, all of them, before any macrotask.

Cards move between zones. The event loop arrows rotate once when a task is taken from a queue. The line that is running is highlighted in the editor. The console shows output in the order a browser would print it.

Each zone has a short explanation and a link to MDN.

## Go at your own pace

Run plays the code on its own, with a pause between steps. Step moves to the next instruction. Slow the speed down when you want time to read what happened. Reset returns to the start.

A function call is its own step on the line that called it. The next step is already inside the function. You see both the call site and the entry into the body.

Timer time is virtual: a `setTimeout` of 100 ms does not make you wait a hundred real milliseconds. The delay is there to show order.

## 68 examples, from the basics to an interview

The list goes from simpler to harder. The level filter keeps Junior, Mid, Senior, or Staff.

First, synchronous code and nested calls. Then timers, promises, `async/await`, `try/catch`, the difference between `let` and `var` in a loop, `clearTimeout`, and `setInterval`. Then the combined questions asked in front-end interviews: several queues, nested callbacks, `Promise.all`, `Promise.race`, `Promise.allSettled`, and the order in which microtasks run before macrotasks.

`debounce` and `throttle` are covered on their own: why a repeated call resets the timer, and why some calls are skipped while the window is closed.

Between the header and the editor, each step says what happened and why. When a run finishes, a short answer appears there: why the console printed exactly that. Your own code uses the same run and has no canned answer. Any example can be edited.

## Who it is for

People learning the event loop who want to see the queue, not only the final `console.log`.

People preparing for an interview who want to say out loud why `4` comes first, then `2`, and why `3` is last.

People who already know “microtasks first” and still get lost when a timer schedules a promise and a promise schedules a timer.
