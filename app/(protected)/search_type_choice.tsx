import Navbar from "@/components/Navbar";
import { View, Text } from "react-native";
import { useState } from "react";
import SearchByTag from "@/components/SearchByTag";
import { useTheme } from "@/hooks/useTheme";
import SegmentedControl from "@/components/SegmentedControl";
import SearchBySession from "@/components/SearchBySession";
import DueDateDisplay from "@/components/DueDateDisplay";


// This component allows users to choose a search type for pregnancy checks.
// Users can select between searching by tag, session, or date.
// Based on the selection, it renders the appropriate search component.
const SearchTypeChoice = () => {
    const [searchType, setSearchType] = useState<'tag' | 'session' | 'date'>('tag');

    const { colors } = useTheme();

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}
        >
            <Navbar
                title="Preg Check"
                subTitle="Search" />
            <View
                style={{
                    width: "100%",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: 20,
                    marginBottom: 10,
                }}
            >
                <Text style={{
                    color: colors.fgColor,
                    fontSize: 20,
                    marginRight: 20,
                    fontWeight: "bold",
                }}>
                    Search By
                </Text>
                <SegmentedControl
                    options={["Tag", "Session", "Date"]}
                    selectedOption={
                        searchType === 'tag' ? "Tag" :
                        searchType === 'session' ? "Session" :
                        "Date"
                    }
                    onSelect={(option) => {
                        if (option === "Tag") setSearchType('tag');
                        else if (option === "Session") setSearchType('session');
                        else setSearchType('date');
                    }}
                    fgColor={colors.buttonColor}
                    bgColor={colors.bgColor}
                    // containerStyle={{
                    //     width: "60%"  // Reduced from 90% since options are shorter now
                    // }}
                    buttonStyleSelected={{
                        fontSize: 24,
                        paddingHorizontal: 10,
                    }}
                />
            </View>

            {/* Conditionally render components based on search type */}
            {searchType === 'tag' && <SearchByTag />}
            {searchType === 'session' && <SearchBySession />}
            {searchType === 'date' && <DueDateDisplay />}

        </View>
    )
}



export default SearchTypeChoice;