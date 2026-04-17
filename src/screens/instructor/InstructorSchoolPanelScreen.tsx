import React from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { InstructorSchoolTab } from './InstructorSchoolTab';

type Props = NativeStackScreenProps<MainStackParamList, 'InstructorSchoolPanel'>;

export const InstructorSchoolPanelScreen: React.FC<Props> = () => {
  return (
    <Screen edges={['top']}>
      <Header title="Okul Paneli" showBack />
      <View style={{ flex: 1 }}>
        <InstructorSchoolTab />
      </View>
    </Screen>
  );
};
