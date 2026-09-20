import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FeedbackAlert({ children, variant = "error" }) {
  const isError = variant === "error";
  return (
    <Alert variant={isError ? "destructive" : "default"} className={isError ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}>
      <CircleAlert />
      <AlertTitle>{isError ? "Unable to complete request" : "Success"}</AlertTitle>
      <AlertDescription className={isError ? "text-red-700" : "text-emerald-700"}>{children}</AlertDescription>
    </Alert>
  );
}
