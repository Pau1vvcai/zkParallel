import ExecutionCard from "../components/ExecutionCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-blue-100">
      {/* header */}
      <header className="max-w-3xl mx-auto px-4 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-800">
          zkParallel
        </h1>
        <p className="text-slate-600 mt-1">
          Generate and verify zero-knowledge proofs directly in your browser
        </p>
      </header>

      {/* main */}
      <main className="max-w-3xl mx-auto px-4 pb-16">
        <ExecutionCard />
      </main>
    </div>
  );
}
