import { CONCEPTS, CONCEPT_FAMILIES, DOCS_EXERCISES, DOCS_HOME } from '@/data/docs';
import { LEVELS } from '@/data/levels';
import { useSeo } from '@/seo/useSeo';
import { Link } from 'react-router-dom';

export function FieldGuide() {
  useSeo({
    title: 'The field guide',
    description:
      'Every SQL concept the game teaches, grouped by family and mapped to its chapter on sql.sh, including where SQLite differs from MySQL, PostgreSQL and SQL Server.',
    path: '/field-guide',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'SQL concepts covered by SQL MASTER',
      numberOfItems: CONCEPTS.length,
      itemListElement: CONCEPTS.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.label,
        description: c.summary,
        url: c.doc.url,
      })),
    },
  });

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h2>The field guide</h2>
          <p className="muted" style={{ margin: 0, maxWidth: '70ch' }}>
            {CONCEPTS.length} concepts, every one of them tied to a chapter of{' '}
            <a href={DOCS_HOME} target="_blank" rel="noreferrer noopener">
              sql.sh
            </a>{' '}
            and to the cases that make you use it. Where sql.sh documents MySQL and this game runs
            SQLite, the difference is written down rather than glossed over.
          </p>
        </div>
        <a className="btn btn--sm" href={DOCS_EXERCISES} target="_blank" rel="noreferrer noopener">
          sql.sh exercises ↗
        </a>
      </div>

      {CONCEPT_FAMILIES.map((family) => {
        const inFamily = CONCEPTS.filter((c) => c.family === family);
        if (inFamily.length === 0) return null;
        return (
          <section className="guide-family" key={family}>
            <div className="section-head" style={{ marginTop: 18 }}>
              <h2 style={{ fontSize: 21 }}>{family}</h2>
              <span className="faint">{inFamily.length} concepts</span>
            </div>
            <div className="concept-grid">
              {inFamily.map((concept) => {
                const cases = LEVELS.filter((l) => l.concepts.includes(concept.slug));
                return (
                  <article className="card concept" key={concept.slug}>
                    <h3>{concept.label}</h3>
                    <p>{concept.summary}</p>
                    {concept.note ? <p className="note">{concept.note}</p> : null}
                    <div className="concept-links">
                      <a href={concept.doc.url} target="_blank" rel="noreferrer noopener">
                        {concept.doc.label} ↗
                      </a>
                      {(concept.extra ?? []).slice(0, 5).map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener">
                          {link.label} ↗
                        </a>
                      ))}
                    </div>
                    {cases.length > 0 ? (
                      <p className="badge__how" style={{ marginTop: 10 }}>
                        Practised in{' '}
                        {cases.slice(0, 6).map((level, i) => (
                          <span key={level.id}>
                            {i > 0 ? ', ' : ''}
                            <Link to={`/case/${level.id}`}>case {level.id}</Link>
                          </span>
                        ))}
                        {cases.length > 6 ? ` and ${cases.length - 6} more` : ''}.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
