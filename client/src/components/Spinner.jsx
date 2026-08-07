export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full animate-spin" style={{border: '4px solid rgba(30,30,30,0.9)', borderTop: '4px solid var(--yellow)'}} />
        <p className="mt-3 font-display font-bold">{label}</p>
      </div>
    </div>
  );
}
