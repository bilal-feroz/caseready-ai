import { isDemoMode } from "@/lib/env";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return <LoginClient demoMode={isDemoMode()} />;
}
