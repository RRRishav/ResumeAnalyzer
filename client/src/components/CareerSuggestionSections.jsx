import { FiBriefcase, FiCpu, FiZap } from 'react-icons/fi';
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

export function SuggestedRolesSection({
  roles = [],
  isLoading = false,
  onFetch,
  animationClass = 'extract-fade-in d2',
}) {
  const hasRoles = roles && roles.length > 0;

  return (
    <Card className={`extract-section career-section extract-grid-full ${animationClass}`}>
      <div className="extract-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="extract-section-icon"><FiBriefcase /></div>
          Suggested Job Roles
        </div>
        {!hasRoles && !isLoading && onFetch && (
          <Button
            size="sm"
            onClick={onFetch}
            className="neon-button-glow"
            style={{
              background: 'linear-gradient(135deg, #76b900 0%, #3f8f00 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <FiZap size={13} /> Suggest Roles
          </Button>
        )}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', gap: '1rem' }}>
          <div className="spinner" style={{ borderTopColor: '#76b900' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Analyzing profile skills & experience to suggest career roles...
          </p>
        </div>
      )}

      {!isLoading && !hasRoles && (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b', fontSize: '0.9rem' }}>
          Click the "Suggest Roles" button to fetch tailored job recommendations for this resume.
        </div>
      )}

      {!isLoading && hasRoles && (
        <div className="career-rec-list" style={{ marginTop: '1rem' }}>
          {roles.map((item, index) => {
            const rec = normalizeRecommendation(item);
            return (
              <div className="career-rec-card" key={`${rec.role}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="career-rec-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="career-rec-role" style={{ color: '#fff', fontWeight: '600', fontSize: '1.05rem' }}>
                    {rec.role}
                  </span>
                  {rec.match_score !== null && rec.match_score !== undefined && (
                    <span
                      className="career-rec-score"
                      style={{
                        background: 'rgba(118, 185, 0, 0.15)',
                        color: '#76b900',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        border: '1px solid rgba(118, 185, 0, 0.3)'
                      }}
                    >
                      {rec.match_score}% Match
                    </span>
                  )}
                </div>
                <div className="career-rec-reason" style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.3rem', lineHeight: '1.4' }}>
                  <strong style={{ color: '#94a3b8' }}>Why this role:</strong> {recommendationReason(rec.reason, rec.role)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function CareerRecommendationsSection() {
  return null;
}
