interface EmptyProps {
  message?: string;
}

export default function Empty({ message = '暂无数据' }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-gray-500 text-lg">{message}</p>
    </div>
  );
}
