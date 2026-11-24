/** Brand logo. `dark` = for light backgrounds (navy wordmark); default = for dark backgrounds (white wordmark). */
export function Logo({ className = '', dark = false, height = 38 }: { className?: string; dark?: boolean; height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dark ? '/brand/logo-full.png' : '/brand/logo-full-light.png'} alt="VidyaOS" height={height} width={Math.round(height * (1803 / 550))} className={className} style={{ height, width: 'auto' }} />;
}

/** The emblem on its own (icons, small spaces). */
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/logo-mark.png" alt="VidyaOS" width={size} height={size} className={className} />;
}
