Golf League App v12.86 - Scorecard OCR + Mobile Failure Alert Improvements

Changes from v12.85:
- Preprocesses scorecard images before OCR by upscaling, grayscaling, and increasing contrast to improve small GSPro setting readability.
- Makes Stimp matching more tolerant of OCR confusions such as 11/II/ll/1 1 and 10/1O.
- Makes 5 ft gimmie matching more tolerant of OCR reading 5 as S when followed by ft/feet.
- Scorecard upload UI exposes only Take Photo and Photo Library actions; generic app-level file wording/options removed.
- Unlocks Web Audio on the initial pointer/tap before the camera/photo picker opens, improving iPhone/iPad audible failure alerts.
- Failure tone is louder/longer and also vibrates on supported devices.

Note: Mobile operating systems control their native media picker. The web app itself only presents Take Photo and Photo Library actions.
