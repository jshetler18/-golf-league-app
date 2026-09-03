Golf League App v12.87

Changes from v12.86:
- Failed scorecard validation now opens a red popup modal instead of putting the failure message under the scorecard image.
- Popup title: “Scorecard check failed and cannot be submitted!”
- Popup gives the requested instructions to correct red failed checks and photograph the computer monitor with the entire card/settings visible.
- Failed checks remain visible in red in the Scorecard Check list after the popup is dismissed.
- Failure audio is now a single simple low 125 Hz square-wave buzzer instead of the multi-note alert.
- Photo Library input is restricted to image media only and the app exposes only Take Photo and Photo Library buttons.

Browser note: iOS/Android control the native media picker UI. A website cannot remove an OS-level “Browse/Choose File” option if the operating system chooses to display it inside its own picker.

Version 12.88: scorecard OCR/check progress now appears in the popup while processing, then transitions to failure popup if validation fails.
