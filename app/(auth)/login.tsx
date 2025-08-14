import { useAuth } from "@/auth/AuthContext";
import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Dimensions,
    Keyboard, Modal, ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";


const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({
        username: "",
        password: "",
        general: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetEmailError, setResetEmailError] = useState("");
    const [resetSubmitting, setResetSubmitting] = useState(false);

    const auth = useAuth();
    const router = useRouter();
    const { width } = Dimensions.get("window");
    const { colors, baseStyle } = useTheme();

    const login = async () => {
        // Dismiss keyboard when login button is pressed
        Keyboard.dismiss();

        // Clear previous errors
        setErrors({ username: "", password: "", general: "" });

        try {
            if (!username.trim()) {
                setErrors(prev => ({ ...prev, username: "Username is required" }));
                return;
            }

            if (!password) {
                setErrors(prev => ({ ...prev, password: "Password is required" }));
                return;
            }

            await auth.login(username, password);
            router.replace("/");
        } catch (error: any) {
            console.log(error);
            // Handle specific error types from the server response if available
            if (error.message?.includes("username")) {
                setErrors(prev => ({ ...prev, username: "Invalid username" }));
            } else if (error.message?.includes("password")) {
                setErrors(prev => ({ ...prev, password: "Invalid password" }));
            } else {
                setErrors(prev => ({ ...prev, general: "Login failed. Please check your credentials." }));
            }
        }
    }

    const handlePasswordReset = async () => {
        setResetEmailError("");

        // Validate email
        if (!resetEmail.trim() || !resetEmail.includes('@')) {
            setResetEmailError("Please enter a valid email address");
            return;
        }

        setResetSubmitting(true);
        try {
            await auth.requestPasswordReset(resetEmail);
            setShowResetModal(false);
            // Redirect to password reset page with email pre-filled
            router.push({
                pathname: "/password_reset",
                params: { email: resetEmail }
            });
        } catch (error: any) {
            setResetEmailError(error.message || "Failed to request password reset");
        } finally {
            setResetSubmitting(false);
        }
    }

    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            style={{ width, backgroundColor: colors.bgColor }}
        >
            <View style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}>
                <Navbar title="Preg Check" subTitle="Login" />

                <Text style={[baseStyle.heading_3, { marginBottom: 20, marginTop: 40 }]}>
                    Enter your login details
                </Text>
                <View style={{ width: "80%", marginTop: 20 }}>
                    <TextInput
                        style={[
                            baseStyle.textInput,
                            errors.username ? { borderColor: colors.error } : {}
                        ]}
                        onChangeText={(text) => {
                            setUsername(text);
                            if (errors.username) setErrors(prev => ({ ...prev, username: "" }));
                        }}
                        value={username}
                        placeholder="Username"
                        testID="login-username-input"
                        autoCapitalize="none"
                    />
                    {errors.username ? (
                        <Text style={{ color: colors.error, marginTop: 5, fontSize: 18 }}>
                            {errors.username}
                        </Text>
                    ) : null}
                </View>

                <View style={{ width: '80%', alignItems: 'center', position: 'relative', marginTop: 10 }}>
                    <TextInput
                        style={[
                            baseStyle.textInput,
                            errors.password ? { borderColor: colors.error } : {}
                        ]}
                        onChangeText={(text) => {
                            setPassword(text);
                            if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                        }}
                        value={password}
                        placeholder="Password"
                        secureTextEntry={!showPassword}
                        testID="login-password-input"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            right: 20,
                            top: '50%',
                            transform: [{ translateY: -16 }],
                            padding: 5
                        }}
                        onPress={() => setShowPassword(!showPassword)}
                        testID="toggle-password-visibility"
                    >
                        <MaterialIcons
                            name={showPassword ? "visibility-off" : "visibility"}
                            size={24}
                            color={colors.fgColor}
                        />
                    </TouchableOpacity>
                    {errors.password ? (
                        <Text style={{ color: colors.error, marginTop: 5, fontSize: 18, alignSelf: 'flex-start' }}>
                            {errors.password}
                        </Text>
                    ) : null}
                </View>

                <Button
                    onPress={login}
                    title="Login"
                    style={{
                        marginVertical: 30,
                        width: '50%',
                    }}
                    outline={false}
                    testID="login-button"
                />

                {errors.general ? (
                    <Text style={{ color: colors.error }}>{errors.general}</Text>
                ) : null}

                {/* Forgot Password Link */}
                <TouchableOpacity
                    onPress={() => setShowResetModal(true)}
                    style={{ marginTop: 20 }}
                >
                    <Text style={{
                        color: colors.fgColor,
                        fontWeight: 'bold',
                        fontSize: 20
                    }}>
                        Forgot password?
                    </Text>
                </TouchableOpacity>

                <View style={[
                    baseStyle.hr
                ]}>
                </View>

                <View style={{ flexDirection: 'column', marginTop: 20, alignItems: 'center' }}>
                    <Text style={{
                        color: colors.fgColor,
                        fontSize: 20
                    }}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => router.push("/register")}>
                        <Text style={{
                            color: colors.fgColor,
                            fontWeight: 'bold',
                            fontSize: 26,
                            marginTop: 5,
                        }}>Register</Text>
                    </TouchableOpacity>
                </View>



                {/* Password Reset Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showResetModal}
                    onRequestClose={() => setShowResetModal(false)}
                >
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)'
                    }}>
                        <View style={{
                            width: '80%',
                            backgroundColor: colors.bgColor,
                            borderRadius: 10,
                            padding: 20,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5
                        }}>
                            <Text style={[baseStyle.heading_3, { marginBottom: 20 }]}>
                                Reset Password
                            </Text>

                            <Text style={{ marginBottom: 15, textAlign: 'center' }}>
                                Enter your email address and we'll send you a six-digit code.
                            </Text>

                            <TextInput
                                style={[
                                    baseStyle.textInput,
                                    { width: '100%', marginBottom: 5 },
                                    resetEmailError ? { borderColor: colors.error } : {}
                                ]}
                                onChangeText={(text) => {
                                    setResetEmail(text);
                                    if (resetEmailError) setResetEmailError("");
                                }}
                                value={resetEmail}
                                placeholder="Email address"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {resetEmailError ? (
                                <Text style={{
                                    color: colors.error,
                                    marginBottom: 10,
                                    fontSize: 18,
                                    alignSelf: 'flex-start'
                                }}>
                                    {resetEmailError}
                                </Text>
                            ) : null}

                            <Button
                                onPress={handlePasswordReset}
                                title={resetSubmitting ? "Sending..." : "Email me the code"}
                                outline={false}
                                style={{ width: '100%', marginTop: 15 }}
                                disabled={resetSubmitting}
                            />

                            <Button
                                onPress={() => setShowResetModal(false)}
                                title="Cancel"
                                outline={true}
                                style={{ width: '100%', marginTop: 10 }}
                            />
                        </View>
                    </View>
                </Modal>
            </View >
        </ScrollView>

    );
}

export default LoginPage;