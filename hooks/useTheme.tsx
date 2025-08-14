import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { themes } from '../styles/theme';
import { StyleSheet } from 'react-native';


export function useTheme() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const colors = themes[theme as keyof typeof themes];

  const baseStyle = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      fontSize: 16,
      color: colors.fgColor,
      fontFamily: 'Nunito', // Remove trailing comma
    },
    heading_1: {
      fontFamily: 'Nunito', 
      fontSize: 32,
      color: colors.fgColor,
      fontWeight: 700,
    },
    heading_2: {
      fontFamily: 'Nunito',
      fontSize: 28,
      color: colors.fgColor,
      fontWeight: 'bold',
    },
    heading_3: {
      fontFamily: 'Nunito',
      fontSize: 24,
      color: colors.fgColor,
      fontWeight: 'bold',
    },
    button: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },
    button_outline: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderColor: colors.thrdColor,
      borderWidth: 1,
      color: colors.fgColor,
      backgroundColor: colors.bgColor,
    },
    buttonText: {
      fontFamily: 'Nunito_Bold',
      fontSize: 24,
      color: colors.bgLightColor,
      textAlign: 'center',
    },
    buttonOutlineText: {
      fontFamily: 'Nunito-Bold',
      fontSize: 24,
      color: colors.fgColor,
      textAlign: 'center',
    },
    textInput: {
      fontFamily: 'Nunito',
      backgroundColor: colors.bgLightColor,
      color: colors.fgColor,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderColor: colors.thrdColor,
      borderWidth: 1,
      borderRadius: 10,
      fontSize: 24,
      width: '100%',
    },
    numberInput: {
      fontFamily: 'Nunito',
      backgroundColor: colors.bgLightColor,
      color: colors.fgColor,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderColor: colors.thrdColor,
      borderWidth: 1,
      borderRadius: 10,
      fontSize: 20,
      width: '100%',
    },
    label: {
      fontFamily: 'Nunito-Bold',
      color: colors.fgColor,
      padding: 10,
      fontSize: 24,
      // fontWeight: 'bold',
      marginBottom: 5,
    },
    shadowContainer: {
      shadowColor: colors.fgColor, // iOS Shadow Color
      shadowOffset: { width: 0, height: 2 }, // Shadow Direction
      shadowOpacity: 0.3, // Shadow darkness (0 - 1)
      shadowRadius: 4, // Blur radius
      elevation: 3, // Android shadow
      borderRadius: 10, // Must be applied here for iOS shadows
    }, 
    navbar: {
      height: 110,
      width: '100%',
      backgroundColor: colors.scndColor,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    navbar_title: {
      fontFamily: 'Nunito',
      color: colors.bgLightColor,
      width: '100%',
      textAlign: 'center',
      letterSpacing: 4,
      fontWeight: 'bold',
      fontSize: 24,
      marginBottom: 5,
      textTransform: 'uppercase',
    }, 
    navbar_subtitle: {
      fontFamily: 'Nunito',
      color: colors.bgLightColor,
      width: '100%',
      textAlign: 'center',
      fontSize: 20,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    animal_card: {
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      width: "90%",
      borderRadius: 20,
      padding: 10,
      backgroundColor: colors.bgLightColor,
      marginVertical: 10,
    },
    hr: {
      borderColor: colors.thrdColor,
      borderBottomWidth: 1,
      marginVertical: 20,
      width: "80%",
      opacity: 0.3,
    },
    icon_button: {
      color: colors.scndColor,
      fontSize: 40,
      padding: 10,
      borderRadius: 10,
    },
    large_icon_button: {
      color: colors.scndColor,
      fontSize: 80,
      padding: 10,
      borderRadius: 10,
      fontWeight: 'bold',
    },
    modal_overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal_content: {
      backgroundColor: colors.bgColor,
      borderRadius: 10,
      padding: 20,
      width: '90%',
      alignItems: 'center',
    },
  }); 

  return {
    theme,
    toggleTheme,
    colors,
    baseStyle,
  };  

}