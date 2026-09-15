'use client';
import Link from 'next/link';
import { CHECK_DISCOVERY } from '../lib/check-discovery';

type CheckType = keyof typeof CHECK_DISCOVERY;
export function CheckChoices({ selected, onSelect, owner = true, disabled = false }: {
  selected?: CheckType; onSelect?: (type: CheckType) => void; owner?: boolean; disabled?: boolean;
}) {
  return <section aria-label="Choose a check">{onSelect ? <h1>What do you want to check?</h1> : <h2>What do you want to check?</h2>}<p className="quiet">External Exposure Check looks from the outside; One Server Security Check collects locally on Linux. They are separate assessments. Adding an asset does not start collection.</p>
    <div className="check-choice-grid">{(Object.keys(CHECK_DISCOVERY) as CheckType[]).map(type => {
      const copy = CHECK_DISCOVERY[type];
      return <article className="check-choice" key={type} aria-label={copy.name}>
        <h3>{copy.name}</h3><p>{copy.description}</p><p className="quiet">{copy.next}</p>
        <dl><div><dt>Best when</dt><dd>{copy.when}</dd></div><div><dt>You provide</dt><dd>{copy.input}</dd></div><div><dt>You get</dt><dd>{copy.output}</dd></div></dl>
        <p className="quiet">{copy.boundary}</p>{type === 'linux_server' && <p className="quiet">Early Access: server-check setup is currently operator-assisted. A Proofpack is the signed package containing the check evidence.</p>}
        {owner ? onSelect ? <button type="button" className="button secondary" aria-pressed={selected === type} disabled={disabled} onClick={() => onSelect(type)}>Choose {copy.name}</button> : <Link className="button secondary" href={`/assets/new?check=${type}`}>Choose {copy.name}</Link> : <p className="quiet">Ask a workspace Owner to add this asset.</p>}
      </article>;
    })}</div>
  </section>;
}
