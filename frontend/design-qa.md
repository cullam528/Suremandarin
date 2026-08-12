# Design QA — SureMandarin course detail

- Source: `../course-detail-concepts/course-detail-refined.png`
- Implementation: `course-detail-implementation-v2.png`
- Combined comparison: `design-qa-comparison.png`
- Route: `/courses/private-course`
- Browser state: desktop, top of page, consultation form empty, contact widget collapsed
- Implementation capture: 1265 × 710 px

## Comparison findings

- Passed: the revised hero now follows the selected image: exact title treatment, green “You.” accent, four course facts, rating/Trustpilot row, two CTAs, teacher-and-student scene, five-field consultation card and floating contact control.
- Passed: visual hierarchy and conversion path remain clear at the tested desktop viewport.
- Passed: no browser console errors; production build and TypeScript checks complete successfully.
- Passed: course copy outside the information-collection form is defined directly in the page component, while the shared header, footer and contact widget continue to reuse the existing site components.
- Intentional responsive adaptation: the implementation uses a wider desktop canvas than the reference export, so the hero expands proportionally while preserving its composition.
- Remaining content below the fold follows the same section order and visual system as the reference: benefits, audience fit, outcomes, roadmap, lesson flow, teacher, testimonials, FAQ, CTA and shared footer.

## Final result

Passed.

## Six-course extension and inquiry integration

- Verified routes: `/courses/private-course`, `/courses/group-course`, `/courses/learn-and-travel-course`, `/courses/ib-tutorial`, `/courses/online-course`, `/courses/exclusive-course`.
- Each route preserves the approved component structure and changes only course-specific copy, facts, audiences, outcomes, roadmap, lesson flow and hero image.
- Browser submission test passed through `/api/inquiries` into Strapi. Confirmed fields: course slug, level, learning goal, preferred time, source page, consent and default `new` status.
- The synthetic integration-test record was removed after verification.
- Browser console errors: none.
- Final result: passed.
