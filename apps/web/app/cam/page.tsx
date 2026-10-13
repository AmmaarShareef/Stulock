import { CameraCode } from "@/components/auth/camera-code";
import { PhonePair } from "@/components/auth/phone-pair";
import { requireOnboardedUser } from "@/lib/auth/user";
export default async function CameraPage() { await requireOnboardedUser(); return <main className="login-page"><section className="login-card"><p className="eyebrow">Local camera setup</p><h1>You decide when processing starts.</h1><p>StuLock processes camera frames on your own devices. Generate a short-lived setup code for the extension; raw video, landmarks, and face templates never reach this site.</p><CameraCode /><PhonePair /></section></main>; }
