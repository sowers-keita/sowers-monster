type PhoneProps = {
  title: string;
  children: React.ReactNode;
};

export default function Phone({ title, children }: PhoneProps) {
  return (
    <main className="page">
      <div className="phone">
        <div className="header">{title}</div>
        <div className="content">{children}</div>
      </div>
    </main>
  );
}
