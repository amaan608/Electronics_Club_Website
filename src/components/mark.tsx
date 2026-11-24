import Image from "next/image";
export function Mark() {
  return <Image className="club-logo" src="/art/club-logo.png" width={48} height={48} alt="" />;
}

export function CornerMarks() {
  return (
    <span className="corners" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
