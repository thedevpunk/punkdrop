import Avatar from "./Avatar";

const Drop = () => {
  const d = 1;

  return (
    <div className="h-full w-full overflow-hidden relative">
      <div className="w-[140vw] aspect-[2/1] border border-b-0 border-slate-100 rounded-t-full absolute bottom-0 -left-[20vw] right-0 m-auto"></div>
      <div className="w-[120vw] aspect-[2/1] border border-b-0 border-slate-100 rounded-t-full absolute bottom-0 -left-[10vw] right-0 m-auto"></div>
      <div className="w-[100vw] aspect-[2/1] border border-b-0 border-slate-200 rounded-t-full absolute bottom-0 left-0 right-0 m-auto"></div>
      <div className="w-[80vw] aspect-[2/1] border border-b-0 border-slate-200 rounded-t-full absolute bottom-0 left-0 right-0 m-auto"></div>
      <div className="w-[60vw] aspect-[2/1] border border-b-0 border-slate-300 rounded-t-full absolute bottom-0 left-0 right-0 m-auto"></div>
      <div className="w-[40vw] aspect-[2/1] border border-b-0 border-slate-300 rounded-t-full absolute bottom-0 left-0 right-0 m-auto"></div>
      <div className="w-[20vw] aspect-[2/1] border border-b-0 border-slate-400 rounded-t-full absolute bottom-0 left-0 right-0 m-auto"></div>

      <Avatar className="absolute bottom-[10rem] left-[4rem] right-0 bg-orange-300" />
      <Avatar className="absolute bottom-[14rem] left-0 right-0 m-auto bg-teal-200" />
      <Avatar className="absolute bottom-[10rem] right-[4rem] bg-indigo-300" />

      <div className="flex flex-col items-center gap-4 absolute bottom-4 left-0 right-0 m-auto">
        <Avatar />
        <p>Share files with people.</p>
      </div>
    </div>
  );
};

export default Drop;
