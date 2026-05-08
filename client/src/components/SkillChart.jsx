import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

export default function SkillChart({ skillCategories = {} }) {
  const data = Object.entries(skillCategories).map(([category, skills]) => ({
    category: category.length > 15 ? category.substring(0, 12) + '...' : category,
    fullName: category,
    count: Array.isArray(skills) ? skills.length : 0,
    skills: Array.isArray(skills) ? skills : [],
  }));

  if (data.length === 0) {
    return (
      <div className="skill-chart-empty">
        <p>No skill data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 5);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="skill-tooltip-3d">
          <p className="skill-tooltip-title">{item.fullName}</p>
          <p className="skill-tooltip-count">{item.count} skills detected</p>
          <p className="skill-tooltip-list">{item.skills.join(', ')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="skill-chart-3d">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="rgba(34,211,238,0.08)" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            domain={[0, maxCount]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Skills"
            dataKey="count"
            stroke="#22d3ee"
            fill="url(#skillRadarGrad)"
            fillOpacity={0.3}
            strokeWidth={2.5}
          />
          <defs>
            <linearGradient id="skillRadarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
