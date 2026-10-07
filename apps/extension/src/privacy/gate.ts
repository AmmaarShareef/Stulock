export type CameraEligibility = { ageGatePassed: boolean; biometricConsentGiven: boolean };
export function canRequestCamera(eligibility: CameraEligibility): boolean { return eligibility.ageGatePassed && eligibility.biometricConsentGiven; }
