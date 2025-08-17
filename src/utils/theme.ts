type Theme = 'light' | 'dark';

interface ThemeClasses {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    primary: string;
    secondary: string;
    accent: string;
  };
  interactive: {
    primary: string;
    secondary: string;
    accent: string;
  };
  card: {
    background: string;
    border: string;
    hover: string;
    shadow: string;
  };
  nav: {
    background: string;
    border: string;
    link: string;
  };
}

export function getThemeClasses(theme: Theme): ThemeClasses {
  if (theme === 'dark') {
    return {
      background: {
        primary: 'bg-background',
        secondary: 'bg-muted',
        tertiary: 'bg-accent',
      },
      text: {
        primary: 'text-foreground',
        secondary: 'text-muted-foreground',
        tertiary: 'text-accent-foreground',
        inverse: 'text-primary-foreground',
      },
      border: {
        primary: 'border-border',
        secondary: 'border-muted',
        accent: 'border-accent',
      },
      interactive: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
      },
      card: {
        background: 'bg-card',
        border: 'border-border',
        hover: 'hover:bg-muted/50',
        shadow: 'shadow-sm',
      },
      nav: {
        background: 'bg-card',
        border: 'border-border',
        link: 'text-foreground hover:text-muted-foreground',
      },
    };
  }

  // Light theme
  return {
    background: {
      primary: 'bg-background',
      secondary: 'bg-muted',
      tertiary: 'bg-accent',
    },
    text: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
      tertiary: 'text-accent-foreground',
      inverse: 'text-primary-foreground',
    },
    border: {
      primary: 'border-border',
      secondary: 'border-muted',
      accent: 'border-accent',
    },
    interactive: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
    },
    card: {
      background: 'bg-card',
      border: 'border-border',
      hover: 'hover:bg-muted/50',
      shadow: 'shadow-sm',
    },
    nav: {
      background: 'bg-card',
      border: 'border-border',
      link: 'text-foreground hover:text-muted-foreground',
    },
  };
}