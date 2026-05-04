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
        <div className="skill-chart-tooltip">
          <p className="skill-chart-tooltip-title">{item.fullName}</p>
          <p className="skill-chart-tooltip-count">{item.count} skills</p>
          <p className="skill-chart-tooltip-list">{item.skills.join(', ')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="skill-chart">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#a0a0b8', fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            domain={[0, maxCount]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Skills"
            dataKey="count"
            stroke="#6c63ff"
            fill="#6c63ff"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
