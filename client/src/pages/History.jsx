import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import api from '../services/api';
import AnalysisCard from '../components/AnalysisCard';
import {
  buildPromptSearchPlan,
  createResumeSearchIndex,
  getFilterOptions,
  getSearchExamples,
  getSkillSuggestions,
  getTopDatasetSkills,
  loadResumeDataset,
  searchResumes,
} from '../data/resumeDataset';
import { FiDatabase, FiDownload, FiRefreshCcw, FiSearch, FiTarget, FiUsers } from 'react-icons/fi';
import './History.css';

const DEFAULT_FILTERS = {
  location: '',
  experienceLevel: '',
  minScore: 0,
  minAts: 0,
  sortBy: 'relevance',
  requiredSkills: [],
};

export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [rolePrompt, setRolePrompt] = useState('');
  const [activeRole, setActiveRole] = useState('');
  const [uploadedResumes, setUploadedResumes] = useState([]);
  const [dataset, setDataset] = useState([]);
  const [usingDatasetFilter, setUsingDatasetFilter] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const deferredPrompt = useDeferredValue(rolePrompt);
  const deferredSearch = useDeferredValue(search);

  const topSkills = useMemo(() => getTopDatasetSkills(dataset, 10), [dataset]);
  const searchableResumes = useMemo(() => [...uploadedResumes, ...dataset], [uploadedResumes, dataset]);
  const searchIndex = useMemo(() => createResumeSearchIndex(searchableResumes), [searchableResumes]);
  const searchPlan = useMemo(() => buildPromptSearchPlan(searchIndex, deferredPrompt), [searchIndex, deferredPrompt]);
  const skillSuggestions = useMemo(() => getSkillSuggestions(searchIndex, deferredPrompt, 8), [searchIndex, deferredPrompt]);
  const searchExamples = useMemo(() => getSearchExamples(searchIndex, 5), [searchIndex]);
  const filterOptions = useMemo(() => getFilterOptions(searchableResumes), [searchableResumes]);
  const datasetRoleCount = useMemo(() => new Set(dataset.map((item) => item.role).filter(Boolean)).size, [dataset]);
  const visibleDatasetCount = analyses.filter((item) => item.source === 'dataset').length;
  const activeFilterCount = [
    rolePrompt.trim(),
    search.trim(),
    filters.location,
    filters.experienceLevel,
    Number(filters.minScore) > 0,
    Number(filters.minAts) > 0,
    filters.requiredSkills.length > 0,
    filters.sortBy !== 'relevance',
  ].filter(Boolean).length;

  useEffect(() => {
    if (!activeRole) loadHistory();
  }, [page, activeRole]);

  useEffect(() => {
    const prompt = deferredPrompt.trim();
    const filename = deferredSearch.trim();
    const hasAdvancedFilters = Boolean(
      filters.location
      || filters.experienceLevel
      || Number(filters.minScore) > 0
      || Number(filters.minAts) > 0
      || filters.requiredSkills.length
      || filters.sortBy !== 'relevance'
    );

    if (!prompt && !filename && !hasAdvancedFilters) {
      if (usingDatasetFilter) {
        setAnalyses(searchableResumes);
        setUsingDatasetFilter(false);
        setActiveRole('');
      }
      return;
    }

    const nextResults = searchResumes(searchIndex, {
      prompt,
      filename,
      ...filters,
    });
    setAnalyses(nextResults);
    setActiveRole(prompt || filename || 'Advanced filters');
    setTotalPages(1);
    setPage(1);
    setUsingDatasetFilter(true);
  }, [deferredPrompt, deferredSearch, filters, searchIndex, searchableResumes, usingDatasetFilter]);

  const loadHistory = async (pageToLoad = page) => {
    setLoading(true);
    try {
      const [historyRes, datasetRows] = await Promise.all([
        api.get(`/resume/history?page=${pageToLoad}&limit=12`).catch(() => null),
        dataset.length ? Promise.resolve(dataset) : loadResumeDataset(),
      ]);
      const uploadedRows = historyRes?.data?.analyses || [];
      setUploadedResumes(uploadedRows);
      setDataset(datasetRows);
      setAnalyses([...uploadedRows, ...datasetRows]);
      setTotalPages(historyRes?.data?.pagination?.totalPages || 1);
      setUsingDatasetFilter(false);
    } catch (err) {
      console.error('Failed to load history:', err);
      try {
        const datasetRows = await loadResumeDataset();
        setDataset(datasetRows);
        setAnalyses(datasetRows);
        setTotalPages(1);
      } catch (datasetErr) {
        console.error('Failed to load built-in dataset:', datasetErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchByRole = async (event) => {
    event.preventDefault();
    const prompt = rolePrompt.trim();
    if (!prompt) return;

    setFiltering(true);
    setActiveRole(prompt);
    try {
      const [searchRes, datasetRows] = await Promise.all([
        api.get('/resume/search/role', { params: { role: prompt } }).catch(() => null),
        dataset.length ? Promise.resolve(dataset) : loadResumeDataset(),
      ]);
      const mergedRows = [...(searchRes?.data?.results || []), ...datasetRows];
      const mergedIndex = createResumeSearchIndex(mergedRows);
      const matches = searchResumes(mergedIndex, {
        prompt,
        filename: search,
        ...filters,
      });
      setDataset(datasetRows);
      setAnalyses(matches);
      setTotalPages(1);
      setPage(1);
      setUsingDatasetFilter(true);
    } catch (err) {
      console.error('Failed to filter resumes:', err);
      setAnalyses([]);
      setTotalPages(1);
    } finally {
      setFiltering(false);
    }
  };

  const resetRoleFilter = () => {
    setRolePrompt('');
    setSearch('');
    setFilters(DEFAULT_FILTERS);
    setActiveRole('');
    setUsingDatasetFilter(false);
    setPage(1);
    loadHistory(1);
  };

  const handleRolePromptChange = (value) => {
    setRolePrompt(value);
  };

  const applySuggestedSkill = (skill) => {
    setFilters((current) => (
      current.requiredSkills.includes(skill)
        ? current
        : { ...current, requiredSkills: [...current.requiredSkills, skill] }
    ));
  };

  const applyPromptExample = (prompt) => {
    handleRolePromptChange(prompt);
  };

  const removeRequiredSkill = (skill) => {
    setFilters((current) => ({
      ...current,
      requiredSkills: current.requiredSkills.filter((item) => item !== skill),
    }));
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const downloadRowsAsCsv = (rows, filename) => {
    const headers = ['ID', 'Name', 'Filename', 'Role', 'Experience Level', 'Overall Score', 'ATS Score', 'Skills', 'Location'];
    const escapeCsv = (value) => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [
      headers.join(','),
      ...rows.map((row) => [
        row.dataset_id || row.id,
        row.name || '',
        row.filename,
        row.role || row.job_title_match || '',
        row.experience_level,
        row.overall_score,
        row.ats_score,
        (row.skills || []).map((skill) => (
          typeof skill === 'string' ? skill : skill.name || skill.skill || skill.title || skill.value || ''
        )).filter(Boolean).join('; '),
        row.location || '',
      ].map(escapeCsv).join(',')),
    ];

    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = async (filteredOnly = false) => {
    setDownloading(true);
    try {
      if (usingDatasetFilter || analyses.some((item) => item.source === 'dataset')) {
        const rows = filteredOnly ? analyses : (dataset.length ? dataset : analyses);
        downloadRowsAsCsv(rows, filteredOnly ? 'filtered-resume-dataset.csv' : 'resume-dataset.csv');
        return;
      }

      const endpoint = filteredOnly ? '/resume/export/csv/filtered' : '/resume/export/csv';
      const res = await api.get(endpoint, {
        params: filteredOnly ? { role: activeRole || rolePrompt } : {},
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filteredOnly ? 'filtered-resumes.csv' : 'all-resumes.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="history">
      <div className="container">
        <section className="history-hero animate-fade-in-up">
          <div className="history-hero-copy">
            <span className="history-kicker"><FiDatabase /> Resume Dataset</span>
            <h1>Find candidates by <span className="text-gradient">skills</span></h1>
            <p>Search uploaded resumes and the CSV bank with natural prompts. The filter expands roles into related skills from the resumes themselves.</p>
          </div>
          <div className="history-hero-stats">
            <div>
              <strong>{dataset.length || '...'}</strong>
              <span>CSV resumes</span>
            </div>
            <div>
              <strong>{datasetRoleCount || '...'}</strong>
              <span>role groups</span>
            </div>
            <div>
              <strong>{visibleDatasetCount}</strong>
              <span>visible matches</span>
            </div>
          </div>
        </section>

        <div className="history-control-panel animate-fade-in-up stagger-1">
          <div className="history-header">
            <div>
              <h2><FiUsers /> Candidate Search</h2>
              <p>Search for the job role, must-have skills, tools, location, experience level, and minimum scores. Results are ranked by resume evidence.</p>
            </div>
            <button className="btn btn-secondary btn-sm" disabled={downloading}
              onClick={() => downloadCsv(false)}>
              <FiDownload /> Dataset CSV
            </button>
          </div>

          <div className="history-tools">
            <div className="history-search">
              <FiSearch className="history-search-icon" />
              <input type="text" className="form-input" placeholder="Search name or filename..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <form className="history-role-filter" onSubmit={searchByRole}>
            <FiTarget className="history-role-icon" />
            <div className="history-prompt-field">
              <input
                type="text"
                className="form-input"
                placeholder="Search role, skills, tools, domain, or summary"
                value={rolePrompt}
                onChange={(e) => handleRolePromptChange(e.target.value)}
              />
              {rolePrompt.trim() && skillSuggestions.length > 0 && (
                <div className="history-suggestions" aria-label="Skill suggestions">
                  <span>Suggested skills</span>
                  {skillSuggestions.map((skill) => (
                    <button key={skill} type="button" onClick={() => applySuggestedSkill(skill)}>
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={filtering || !rolePrompt.trim()}>
              <FiSearch /> Search
            </button>
            {activeFilterCount > 0 && (
              <>
                <button className="btn btn-secondary btn-sm" type="button" disabled={downloading}
                  onClick={() => downloadCsv(true)}>
                  <FiDownload /> Filtered CSV
                </button>
                <button className="btn btn-secondary btn-sm" type="button" onClick={resetRoleFilter}>
                  <FiRefreshCcw /> Reset
                </button>
              </>
            )}
          </form>

          <div className="history-advanced-filters">
            <label>
              <span>Location</span>
              <select className="form-input" value={filters.location} onChange={(e) => updateFilter('location', e.target.value)}>
                <option value="">Any location</option>
                {filterOptions.locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Experience</span>
              <select className="form-input" value={filters.experienceLevel} onChange={(e) => updateFilter('experienceLevel', e.target.value)}>
                <option value="">Any level</option>
                {filterOptions.experienceLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Min score</span>
              <input className="form-input" type="number" min="0" max="100" value={filters.minScore}
                onChange={(e) => updateFilter('minScore', e.target.value)} />
            </label>
            <label>
              <span>Min ATS</span>
              <input className="form-input" type="number" min="0" max="100" value={filters.minAts}
                onChange={(e) => updateFilter('minAts', e.target.value)} />
            </label>
            <label>
              <span>Sort</span>
              <select className="form-input" value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="score">Overall score</option>
                <option value="ats">ATS score</option>
                <option value="experience">Experience</option>
              </select>
            </label>
          </div>

          {filters.requiredSkills.length > 0 && (
            <div className="history-required-skills">
              <span>Must-have skills</span>
              {filters.requiredSkills.map((skill) => (
                <button key={skill} type="button" onClick={() => removeRequiredSkill(skill)}>
                  {skill}
                </button>
              ))}
            </div>
          )}

          <div className="history-examples">
            <span>Search ideas</span>
            {searchExamples.map((prompt) => (
              <button key={prompt} type="button" onClick={() => applyPromptExample(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          {topSkills.length > 0 && (
            <div className="history-skill-cloud">
              <span>Popular skills</span>
              {topSkills.map((skill) => (
                <button key={skill} type="button" onClick={() => handleRolePromptChange(skill)}>
                  {skill}
                </button>
              ))}
            </div>
          )}

          <div className="history-filter-summary">
            {activeFilterCount > 0 ? (
              <>
                <span>Showing <strong>{analyses.length}</strong> candidates matched from <strong>{searchableResumes.length}</strong> profiles.</span>
                {(searchPlan.roleMatches.length > 0 || searchPlan.expandedSkills.length > 0 || searchPlan.queryTokens.length > 0) && (
                  <div className="history-inferred-skills">
                    {searchPlan.roleMatches.slice(0, 2).map((role) => (
                      <span key={role}>{role}</span>
                    ))}
                    {searchPlan.expandedSkills.slice(0, 8).map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>Showing all CSV candidates and uploaded resumes.</>
            )}
          </div>
        </div>

        {loading ? (
          <div className="history-loading"><div className="spinner" /></div>
        ) : analyses.length === 0 ? (
          <div className="history-empty glass-card">
            <p>No analyses found</p>
          </div>
        ) : (
          <>
            <div className="history-grid animate-fade-in-up stagger-1">
              {analyses.map(a => <AnalysisCard key={a.id} analysis={a} />)}
            </div>

            {totalPages > 1 && (
              <div className="history-pagination">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="history-page-info">Page {page} of {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
