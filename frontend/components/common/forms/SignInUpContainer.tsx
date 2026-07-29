export function SignInUpContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-4 shadow-md sm:p-6">
      {children}
    </div>
  );
}
