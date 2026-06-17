import { FiBriefcase, FiChevronDown, FiStar } from 'react-icons/fi';
import { Button } from './ui/button';
import { Card } from './ui/card';

function recommendationReason(reason, role) {
  return String(reason || '').trim() || `Good fit for ${role}`;
}

function normalizeRecommendation(item) {
  if (typeof item === 'string') {
    return { role: item, match_score: null, reason: `Suggested job role for this resume` };
  }

  return {
    role: item?.role || item?.title || 'Recommended Role',
    match_score: item?.match_score ?? item?.score ?? null,
    reason: item?.reason || item?.description || '',
  };
}

export function CareerRecommendationsSection({
  recommendations = [],
  fallbackRoles = [],
  animationClass = 'extract-fade-in d2',
}) {
  const items = recommendations?.length ? recommendations : fallbackRoles;

  if (!items?.length) return null;

  return (
    <Card className={`extract-section career-section extract-grid-full ${animationClass}`}>
      <div className="extract-section-title">
        <div className="extract-section-icon"><FiStar /></div>
        Career Recommendations
      </div>
      <div className="career-rec-list">
        {items.map((item, index) => {
          const rec = normalizeRecommendation(item);
          return (
            <div className="career-rec-card" key={`${rec.role}-${index}`}>
              <div className="career-rec-main">
                <span className="career-rec-role">{rec.role}</span>
                {rec.match_score !== null && rec.match_score !== undefined && (
                  <span className="career-rec-score">{rec.match_score}%</span>
                )}
              </div>
              <ul className="career-rec-mini-list">
                <li>{recommendationReason(rec.reason, rec.role)}</li>
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function SuggestedRolesSection({
  roles = [],
  show,
  onToggle,
  title = 'Suggested Job Roles',
  animationClass = 'extract-fade-in d2',
}) {
  if (!roles?.length) return null;

  return (
    <Card className={`extract-section suggested-roles-section extract-grid-full ${animationClass}`}>
      <div className="extract-section-title">
        <div className="extract-section-icon"><FiBriefcase /></div>
        {title}
        <Button
          size="sm"
          variant="outline"
          className="suggested-toggle-btn"
          onClick={onToggle}
        >
          {show ? 'Hide Roles' : 'Show Roles'}
          <FiChevronDown className={show ? 'rotate' : ''} size={14} />
        </Button>
      </div>
      {show && (
        <div className="extract-skills-grid suggested-roles-grid">
          {roles.map((role, index) => (
            <span key={`${role}-${index}`} className="extract-skill-tag role-tag">
              {role}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
