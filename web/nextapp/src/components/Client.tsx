import { IconDeviceLaptop } from "@tabler/icons-react";

type Props = {
  name: string;
  connect: () => void;
};

export default function Client({ name, connect }: Props) {
  return (
    <button
      onClick={connect}
      className="flex flex-col gap-1 items-center w-20 h-20"
    >
      <IconDeviceLaptop className="w-12 h-12" />
      <p className="text-xs font-mono">{name}</p>
    </button>
  );
}
