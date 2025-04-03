// Styles
import styles from "@/styles/components/Loading.module.scss";

interface LogoAnimationProps {
  color?: string;
}

const LoadingAnimation = ({ color }: LogoAnimationProps) => {
  const styleOverride = color
    ? {
        backgroundColor: color,
      }
    : {};
  return (
    <div className={styles.animationContainer}>
      <span className={styles.loadingDot} style={styleOverride}></span>
      <span className={styles.loadingDot} style={styleOverride}></span>
      <span className={styles.loadingDot} style={styleOverride}></span>
    </div>
  );
};

export default LoadingAnimation;
