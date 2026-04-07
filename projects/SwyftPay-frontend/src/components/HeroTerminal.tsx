export function HeroTerminal() {
  return (
    <div className="hero-terminal-root w-full max-w-md min-w-0 lg:max-w-lg">
      <div className="hero-terminal-stage">
        <div className="hero-terminal-pivot">
          <div className="hero-terminal-backlight hero-terminal-backlight--outer" aria-hidden />
          <div className="hero-terminal-backlight" aria-hidden />
          <div className="hero-terminal-shell">
            <div className="hero-terminal-chrome">
              <span className="hero-terminal-dot hero-terminal-dot--red" />
              <span className="hero-terminal-dot hero-terminal-dot--amber" />
              <span className="hero-terminal-dot hero-terminal-dot--green" />
              <span className="hero-terminal-chrome-title">swyftpay fetch</span>
            </div>
            <div className="hero-terminal-body font-mono">
              <p className="hero-terminal-line hero-terminal-line--cmd truncate" title="$ swyftpay fetch https://example.x402.goplausible.xyz/avm/weather">
                $ swyftpay fetch https://example.x402.goplausible.xyz/avm/weather
              </p>
              <p className="hero-terminal-line">
                <span className="text-purple">[SwyftPay]</span>{" "}
                <span className="text-text-muted">402 — payment required</span>
              </p>
              <p className="hero-terminal-line">
                <span className="text-purple">[SwyftPay]</span>{" "}
                <span className="text-text-muted">policy </span>
                <span className="text-green-400">PASSED</span>
                <span className="text-text-muted"> · signing USDC</span>
              </p>
              <p className="hero-terminal-line">
                <span className="text-purple">[SwyftPay]</span>{" "}
                <span className="text-text-muted">settled </span>
                <span className="text-green-400">TX 7FHL2V…XEMOQ</span>
              </p>
              <p className="hero-terminal-line hero-terminal-line--ok">200 OK</p>
              <p className="hero-terminal-line mt-2 text-text-muted">{"{"}</p>
              <p className="hero-terminal-line hero-terminal-line--json text-text-muted pl-3">
                <span className="text-pink">&quot;forecast&quot;</span>:{" "}
                <span className="text-pink">&quot;clear&quot;</span>,
              </p>
              <p className="hero-terminal-line hero-terminal-line--json text-text-muted pl-3">
                <span className="text-pink">&quot;trust_score&quot;</span>:{" "}
                <span className="text-purple">94</span>
              </p>
              <p className="hero-terminal-line text-text-muted">{"}"}</p>
              <p className="hero-terminal-line mt-2">
                <span className="text-text-muted/50">$</span>{" "}
                <span className="hero-terminal-cursor" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
