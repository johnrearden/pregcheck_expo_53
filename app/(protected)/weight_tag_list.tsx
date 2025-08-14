import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import { useWeightRecordMethod } from "@/contexts/WeightRecordContext";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";


// This component displays a list of weight tags for the user to select from.
// When a tag is selected, it navigates to the weight record page with the selected tag as a parameter.
const WeightTagList = () => {

    const { getTagList } = useWeightRecordMethod();
    const router = useRouter();

    const { colors } = useTheme();

    const handleTagSelect = (tag: string) => {
        router.replace(`/calf_weight_record?tag=${tag}`);
    }

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}
        >
            <Navbar title="Preg Check" subTitle="Editor" />

            <Button
                title="Back"
                onPress={() => {
                    router.back();
                }}
                style={{
                    marginTop: 30,
                    width: "40%"
                }}

            />

            <ScrollView
                style={{
                    width: "100%",
                    padding: 20,
                    backgroundColor: colors.bgColor,
                }}
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                bounces={false}
            >

                {getTagList().map((tag) => (
                    <TouchableOpacity
                        key={tag}
                        onPress={() => handleTagSelect(tag)}
                        style={{
                            width: "80%",
                            marginVertical: 10,
                        }}
                        activeOpacity={0.7}
                    >
                        <View
                            style={{
                                padding: 15,
                                backgroundColor: "#f0f0f0",
                                borderRadius: 5,
                                alignItems: "center",
                                borderWidth: 1,
                                borderColor: "#ddd",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    color: "#333",
                                    fontWeight: "bold",
                                }}
                            >
                                {tag}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
                <Text
                    style={{
                        fontSize: 16,
                        color: "#666",
                        marginTop: 20,
                    }}
                >
                    Select a tag to proceed
                </Text>
            </ScrollView>


        </View>
    )
}

export default WeightTagList;