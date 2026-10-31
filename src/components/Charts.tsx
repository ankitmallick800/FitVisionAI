import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  background: "#15191D",
  border: "1px solid #2A3138",
  borderRadius: 12,
  color: "#F5F7FA",
};

export function MinuteBars({ data }: { data: { name: string; minutes: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#2A3138" vertical={false} />
          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: "rgba(184,255,59,0.06)" }} contentStyle={tooltipStyle} />
          <Bar dataKey="minutes" name="Minutes" fill="#B8FF3B" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLines({ data }: { data: { label: string; correct: number; minutes: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#2A3138" vertical={false} />
          <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="correct" name="Correct reps %" stroke="#B8FF3B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="minutes" name="Minutes" stroke="#F5C16C" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeightLine({ data, unit }: { data: { label: string; weight: number }[]; unit: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#2A3138" vertical={false} />
          <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="weight" name={`Weight (${unit})`} stroke="#B8FF3B" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
