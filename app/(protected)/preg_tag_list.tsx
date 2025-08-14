import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import { usePersistRecord } from "@/contexts/RecordContext";
import { useTheme } from "@/hooks/useTheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";


// This is the PregTagList component that allows users to select a tag for pregnancy checks.
// It displays a list of available tags and navigates to the appropriate record creation page based on the selected tag and animal type.
const PregTagList = () => {
    const { animal } = useLocalSearchParams<{ animal?: string }>();

    const { getTagList } = usePersistRecord();
    const router = useRouter();

    const { colors } = useTheme();

    const handleTagSelect = (tag: string) => {
        if (animal === 'C') {
            router.replace(`/create_cow_record?tag=${tag}`);
        } else {
            router.replace(`/create_sheep_goat_record?tag=${tag}`);
        }
    }

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgLightColor,
            }}
        >
            <Navbar title="Preg Check" subTitle="Editor" />

            <Button
                title="Back"
                onPress={() => {
                    if (animal === 'C') {
                        router.replace(`/create_cow_record`);
                    } else {
                        router.replace(`/create_sheep_goat_record`);
                    }
                }}
                style={{
                    marginTop: 30,
                    width: "40%"
                }}

            />

            <Text
                style={{
                    fontSize: 16,
                    marginTop: 20,
                }}
            >
                {getTagList().length === 0 ? "No tags available" : "Select a tag to proceed"}
            </Text>
            

            <ScrollView
                style={{
                    width: "100%",
                    padding: 20,
                    backgroundColor: colors.bgLightColor,
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

            </ScrollView>


        </View>
    )
}

export default PregTagList;