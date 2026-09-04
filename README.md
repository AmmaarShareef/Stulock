# StuLock

A self-imposed study proctor. It watches your desk through the webcam, watches your
browser through the extension APIs, and holds you to a contract you signed before the
session started.

Three monitoring layers, fused:

1. **Vision** - presence, gaze, phone-jail, writing bouts, fatigue. All on-device.
2. **Device** - tab switches, leaving the browser, task-relevant blocking.
3. **Policy** - an LLM judges whether what you are doing matches what you said you would do.

Violations escalate through a feedback ladder and cost you session score. The report
afterwards is the actual product.

## Status

Scaffold. Nothing is implemented yet.

## The spec

`docs/technical-framework.html` is the decision record. Every technology choice is
locked there with its reasoning, along with performance budgets, the evaluation gates,
and an ordered learning path. Read it before writing code.

## Structure

    apps/extension    the product - Chrome/Edge MV3 extension
    apps/web          marketing, auth, billing, and the phone-camera page
    packages/core     rules: state machines, scoring, shared types
    packages/vision   camera pipeline: models, worker, gaze maths
    packages/db       local (Dexie) and remote (Supabase) data shapes
    packages/ui       components shared by the extension and the web app
    packages/eval     labelled clips and the accuracy harness
    supabase/         database migrations and edge functions

`apps/` ship to users. `packages/` are ingredients compiled into them and never
deployed on their own.

## The rule that keeps this clean

`packages/core` and `packages/vision` must never import `chrome.*`, React, or the DOM.
They take inputs and return values. That is what makes them testable without a browser,
and what lets the same fusion logic run in the extension, the eval harness, and any
future desktop build.

## Ship gate

No intervention ships until the eval harness reports **under 1 false alarm per hour**
against the labelled corpus. A buzzer whose false-positive rate you cannot state out
loud is not ready.
