import { UserButton, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function UserNav() {
  const { user, isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="flex items-center space-x-4">
        <Link href="/sign-in">
          <Button variant="outline">Entrar</Button>
        </Link>
        <Link href="/sign-up">
          <Button>Criar Conta</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-600">
        Olá, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
      </span>
      <Link href="/dashboard">
        <Button variant="outline" size="sm">Dashboard</Button>
      </Link>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}