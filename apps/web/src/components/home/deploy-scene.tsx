const STEPS = [
  "building image",
  "provisioning server",
  "configuring network",
  "provisioning ssl",
] as const;

export function DeployScene({ liveHost }: { liveHost: string }) {
  return (
    <aside className="home-scene" aria-label="Example deploy session">
      <div className="home-scene-head">
        <span className="home-scene-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>deploy</span>
      </div>
      <div className="home-scene-body">
        <dl className="home-scene-meta">
          <dt>repository</dt>
          <dd>github.com/you/api</dd>
          <dt>branch</dt>
          <dd>main</dd>
          <dt>dockerfile</dt>
          <dd>detected</dd>
        </dl>

        <ul className="home-scene-steps">
          {STEPS.map((step) => (
            <li key={step} className="home-scene-step">
              <span>✓ {step}</span>
              <span className="home-scene-bar" aria-hidden>
                <span />
              </span>
              <span>100%</span>
            </li>
          ))}
        </ul>

        <dl className="home-scene-live">
          <dt>Live</dt>
          <dd>https://{liveHost}</dd>
        </dl>

        <p className="home-scene-prompt">
          $<span className="home-scene-block" aria-hidden />
        </p>
      </div>
    </aside>
  );
}
