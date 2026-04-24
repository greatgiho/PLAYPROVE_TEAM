import styles from "./playprove.module.css";

type PlayproveSupportLinkProps = {
  supportHref?: string;
  className?: string;
};

export function PlayproveSupportLink({
  supportHref = "mailto:support@playprove.com",
  className,
}: PlayproveSupportLinkProps) {
  return (
    <p className={[styles.ppSupport, className].filter(Boolean).join(" ")}>
      Need help?{" "}
      <a href={supportHref} rel="noreferrer">
        Contact support.
      </a>
    </p>
  );
}
