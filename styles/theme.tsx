export interface ThemeType {
    bgColor: string;
    fgColor: string;
    scndColor: string;
    thrdColor: string;    
    brgtColor: string;
    buttonColor: string;
    warnColor: string;
    bgLightColor: string,
}

export const themes = {
    light: {
      bgColor: "#e4f6e6",
      fgColor: "#2e2e2e",
      scndColor: "#079d93",
      thrdColor: "#c1c4c1",
      brgtColor: "#1a6e69",
      buttonColor: "#081616",
      // buttonColor: "#079d93",
      warnColor: "#c2890d",
      bgLightColor: "#fafafa",
      success: "green",
      error: "red",
      warning: "orange",
    },
    dark: {
      bgColor: "#e4f6e6",
      fgColor: "#2e2e2e",
      scndColor: "#079d93",
      thrdColor: "#c1c4c1",
      brgtColor: "#1a6e69",
      buttonColor: "#081616",
      // buttonColor: "#079d93",
      warnColor: "#c2890d",
      bgLightColor: "#fafafa",
      success: "green",
      error: "red",
      warning: "orange",
    },
  };