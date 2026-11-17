export default function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-400">{hint}</p>
    </div>
  )
}
