import { View, TextInput, Text, Dimensions, TouchableOpacity, ScrollView, Keyboard } from "react-native";
import React, { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/Button";
import { MaterialIcons } from '@expo/vector-icons';
import Navbar from "@/components/Navbar";


const RegisterPage = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password1, setPassword1] = useState("");
    const [password2, setPassword2] = useState("");
    const [showPassword1, setShowPassword1] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password1: "",
        password2: "",
        general: ""
    });

    const auth = useAuth();
    const router = useRouter();
    const { width } = Dimensions.get("window");
    const { colors, baseStyle } = useTheme();

    const validateForm = () => {
        // Clear previous errors
        setErrors({
            username: "",
            email: "",
            password1: "",
            password2: "",
            general: ""
        });

        let isValid = true;

        // Validate username
        if (!username.trim()) {
            setErrors(prev => ({ ...prev, username: "Username is required" }));
            isValid = false;
        } else if (username.length < 3) {
            setErrors(prev => ({ ...prev, username: "Username must be at least 3 characters" }));
            isValid = false;
        }
        if (username.includes(' ')) {
            setErrors(prev => ({ ...prev, username: "Username cannot contain spaces" }));
            isValid = false;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setErrors(prev => ({ ...prev, email: "Email is required" }));
            isValid = false;
        } else if (!emailRegex.test(email)) {
            setErrors(prev => ({ ...prev, email: "Please enter a valid email" }));
            isValid = false;
        }

        // Validate password1
        if (!password1) {
            setErrors(prev => ({ ...prev, password1: "Password is required" }));
            isValid = false;
        } else if (password1.length < 4) {
            setErrors(prev => ({ ...prev, password1: "Password must be at least 4 characters" }));
            isValid = false;
        }

        // Validate password2
        if (!password2) {
            setErrors(prev => ({ ...prev, password2: "Please confirm your password" }));
            isValid = false;
        } else if (password1 !== password2) {
            setErrors(prev => ({ ...prev, password2: "Passwords don't match" }));
            isValid = false;
        }

        return isValid;
    };

    const register = async () => {
        // Dismiss keyboard
        Keyboard.dismiss();

        if (!validateForm()) {
            return;
        }

        try {
            const data = await auth.register(username, email, password1, password2);
            console.log(data);
            router.replace("/");
        } catch (error: any) {

            console.log("Registration error: ", error);

            if (Object.keys(error).includes("general")) {
                setErrors(prev => ({ ...prev, general: error.general[0] }));
            }
            if (Object.keys(error).includes("username")) {
                setErrors(prev => ({ ...prev, username: error.username[0] }));
            }
            if (Object.keys(error).includes("password1")) {
                setErrors(prev => ({ ...prev, password1: error.password1[0] }));
            }
            if (Object.keys(error).includes("password2")) {
                setErrors(prev => ({ ...prev, password2: error.password2[0] }));
            }
            if (Object.keys(error).includes("email")) {
                setErrors(prev => ({ ...prev, email: error.email[0] }));
            }
        }
    }

    return (
        <ScrollView
            contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
                paddingBottom: 40
            }}
        >
            <Navbar title="Preg Check" subTitle="Register" />

            <Text style={[baseStyle.heading_3, { marginBottom: 20, marginTop: 30 }]}>
                Create Account
            </Text>

            <View style={{ width: '80%', marginBottom: 10 }}>
                <TextInput
                    style={[
                        baseStyle.textInput,
                        { marginVertical: 5 },
                        errors.username ? { borderColor: colors.error } : {}
                    ]}
                    onChangeText={(text) => {
                        setUsername(text);
                        if (errors.username) setErrors(prev => ({ ...prev, username: "" }));
                    }}
                    value={username}
                    placeholder="Username"
                    placeholderTextColor={colors.fgColor}
                    autoCapitalize="none"
                />
                {errors.username ? (
                    <Text style={{ color: colors.error, fontSize: 18 }}>
                        {errors.username}
                    </Text>
                ) : null}
            </View>

            <View style={{ width: '80%', marginBottom: 10 }}>
                <TextInput
                    style={[
                        baseStyle.textInput,
                        { marginVertical: 5 },
                        errors.email ? { borderColor: colors.error } : {}
                    ]}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                    }}
                    value={email}
                    placeholder="Email"
                    placeholderTextColor={colors.fgColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {errors.email ? (
                    <Text style={{ color: colors.error, fontSize: 18 }}>
                        {errors.email}
                    </Text>
                ) : null}
            </View>

            <View style={{ width: '80%', marginBottom: 10 }}>
                <View style={{ position: 'relative' }}>
                    <TextInput
                        style={[
                            baseStyle.textInput,
                            { marginVertical: 5 },
                            errors.password1 ? { borderColor: colors.error } : {}
                        ]}
                        onChangeText={(text) => {
                            setPassword1(text);
                            if (errors.password1) setErrors(prev => ({ ...prev, password1: "" }));
                        }}
                        value={password1}
                        placeholder="Password"
                        placeholderTextColor={colors.fgColor}
                        secureTextEntry={!showPassword1}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            right: 20,
                            top: '50%',
                            transform: [{ translateY: -12 }],
                            padding: 5
                        }}
                        onPress={() => setShowPassword1(!showPassword1)}
                    >
                        <MaterialIcons
                            name={showPassword1 ? "visibility-off" : "visibility"}
                            size={24}
                            color={colors.fgColor}
                        />
                    </TouchableOpacity>
                </View>
                {errors.password1 ? (
                    <Text style={{ color: colors.error, fontSize: 18 }}>
                        {errors.password1}
                    </Text>
                ) : null}
            </View>

            <View style={{ width: '80%', marginBottom: 20 }}>
                <View style={{ position: 'relative' }}>
                    <TextInput
                        style={[
                            baseStyle.textInput,
                            { marginVertical: 5 },
                            errors.password2 ? { borderColor: colors.error } : {}
                        ]}
                        onChangeText={(text) => {
                            setPassword2(text);
                            if (errors.password2) setErrors(prev => ({ ...prev, password2: "" }));
                        }}
                        value={password2}
                        placeholder="Confirm Password"
                        placeholderTextColor={colors.fgColor}
                        secureTextEntry={!showPassword2}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            right: 20,
                            top: '50%',
                            transform: [{ translateY: -12 }],
                            padding: 5
                        }}
                        onPress={() => setShowPassword2(!showPassword2)}
                    >
                        <MaterialIcons
                            name={showPassword2 ? "visibility-off" : "visibility"}
                            size={24}
                            color={colors.fgColor}
                        />
                    </TouchableOpacity>
                </View>
                {errors.password2 ? (
                    <Text style={{ color: colors.error, fontSize: 18 }}>
                        {errors.password2}
                    </Text>
                ) : null}
            </View>

            <Button
                onPress={register}
                title="Register"
                style={{
                    marginVertical: 10,
                    width: '50%'
                }}
                outline={false}
            />

            <View style={[
                baseStyle.hr
            ]}>
            </View>

            <View style={{
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: 10,

            }}>
                <Text style={{
                    color: colors.fgColor,
                    fontSize: 20,

                }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace("/login")}>
                    <Text style={{
                        color: colors.fgColor,
                        fontWeight: 'bold',
                        fontSize: 26,
                        marginTop: 5
                    }}>Login</Text>
                </TouchableOpacity>
            </View>

            {errors.general ? (
                <Text style={{ color: colors.error, marginTop: 20 }}>{errors.general}</Text>
            ) : null}
        </ScrollView>
    );
}

export default RegisterPage;
