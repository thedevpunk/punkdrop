import { VenetianMask } from "lucide-react";

interface Props {
  className?: string;
}

const Avatar = ({ className }: Props) => {
  return (
    <div
      className={`h-14 w-14 bg-slate-400 rounded-full flex items-center justify-center text-slate-700 border border-slate-600 shadow-xl ${
        className ? className : ""
      }`}
    >
      <VenetianMask className="h-8 w-8" />
    </div>
  );
};

export default Avatar;
