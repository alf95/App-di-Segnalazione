import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Controller, useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import MapView, {
  Marker,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
} from 'react-native-maps';
import { ActivityIndicator, Banner, Button, Menu, Text, TextInput } from 'react-native-paper';
import type { Category, CreateReportDto } from '@urbanreport/types';
import { CreateReportDtoSchema } from '@urbanreport/validators';
import { api } from '@/services/api';
import { useLocation } from '@/hooks/useLocation';
import { syncService } from '@/services/syncService';

const zodResolver: Resolver<CreateReportDto> = async (values) => {
  const parsed = CreateReportDtoSchema.safeParse(values);
  if (parsed.success) {
    return {
      values: parsed.data,
      errors: {},
    };
  }

  const errors = parsed.error.issues.reduce<FieldErrors<CreateReportDto>>((accumulator, issue) => {
    const key = issue.path[0] as keyof CreateReportDto;
    accumulator[key] = {
      type: issue.code,
      message: issue.message,
    };
    return accumulator;
  }, {});

  return {
    values: {} as CreateReportDto,
    errors,
  };
};

export default function NewReportScreen() {
  const { latitude, longitude, loading } = useLocation();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => await api.fetchCategories(),
  });

  const defaultValues = useMemo<CreateReportDto>(
    () => ({
      categoryId: '',
      description: '',
      latitude: latitude ?? 45.4642,
      longitude: longitude ?? 9.19,
      mediaIds: [],
    }),
    [latitude, longitude],
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateReportDto>({
    defaultValues,
    resolver: zodResolver,
  });

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setValue('latitude', latitude);
      setValue('longitude', longitude);
    }
  }, [latitude, longitude, setValue]);

  const selectedCategory = useMemo(() => {
    return categoriesQuery.data?.find((category) => category.id === watch('categoryId')) ?? null;
  }, [categoriesQuery.data, watch]);

  const setMapCoordinates = (nextLatitude: number, nextLongitude: number) => {
    setValue('latitude', nextLatitude, { shouldValidate: true });
    setValue('longitude', nextLongitude, { shouldValidate: true });
  };

  const handleMapPress = (event: MapPressEvent) => {
    setMapCoordinates(
      event.nativeEvent.coordinate.latitude,
      event.nativeEvent.coordinate.longitude,
    );
  };

  const handleMarkerDragEnd = (event: MarkerDragStartEndEvent) => {
    setMapCoordinates(
      event.nativeEvent.coordinate.latitude,
      event.nativeEvent.coordinate.longitude,
    );
  };

  const handleCapturePhoto = async (): Promise<void> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please enable camera access to attach a photo.');
      return;
    }

    const captured = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (captured.canceled || captured.assets.length === 0) {
      return;
    }

    const compressedImage = await ImageManipulator.manipulateAsync(
      captured.assets[0].uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );

    const initResponse = await api.initMediaUpload({
      contentType: 'image/jpeg',
    });
    const imageResponse = await fetch(compressedImage.uri);
    const imageBlob = await imageResponse.blob();

    await fetch(initResponse.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: imageBlob,
    });

    await api.confirmMediaUpload({
      mediaId: initResponse.mediaId,
      key: initResponse.key,
    });

    const nextMediaIds = [...mediaIds, initResponse.mediaId];
    setMediaIds(nextMediaIds);
    setValue('mediaIds', nextMediaIds, { shouldValidate: true });
    setSelectedImageUri(compressedImage.uri);
  };

  const onSubmit = async (values: CreateReportDto): Promise<void> => {
    setIsSubmitting(true);

    try {
      const payload: CreateReportDto = {
        ...values,
        mediaIds,
      };

      await syncService.queueReport(payload);

      try {
        await syncService.syncPendingReports();
        setIsOfflineMode(false);
      } catch (error) {
        console.warn('Immediate sync failed; report queued offline', error);
        setIsOfflineMode(true);
      }

      Alert.alert('Report saved', 'Your report was queued successfully.');
      reset(defaultValues);
      setSelectedImageUri(null);
      setMediaIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Banner visible={isOfflineMode} actions={[]}>
        Offline mode active. Your report will sync automatically when connectivity returns.
      </Banner>

      {loading ? <ActivityIndicator /> : null}

      <Menu
        visible={categoryMenuVisible}
        onDismiss={() => setCategoryMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setCategoryMenuVisible(true)}>
            {selectedCategory ? selectedCategory.name : 'Select category'}
          </Button>
        }
      >
        {(categoriesQuery.data ?? []).map((category: Category) => (
          <Menu.Item
            key={category.id}
            title={category.name}
            onPress={() => {
              setValue('categoryId', category.id, { shouldValidate: true });
              setCategoryMenuVisible(false);
            }}
          />
        ))}
      </Menu>
      {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId.message}</Text> : null}

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Description"
            mode="outlined"
            multiline
            numberOfLines={5}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={Boolean(errors.description)}
          />
        )}
      />
      {errors.description ? (
        <Text style={styles.errorText}>{errors.description.message}</Text>
      ) : null}

      <Button
        mode="contained-tonal"
        onPress={() => {
          void handleCapturePhoto().catch((err: unknown) =>
            console.warn('Photo capture failed', err),
          );
        }}
      >
        Capture photo
      </Button>
      {selectedImageUri ? (
        <Image source={{ uri: selectedImageUri }} style={styles.preview} />
      ) : null}

      <Text variant="titleMedium">Location</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: watch('latitude'),
          longitude: watch('longitude'),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={handleMapPress}
      >
        <Marker
          draggable
          coordinate={{
            latitude: watch('latitude'),
            longitude: watch('longitude'),
          }}
          onDragEnd={handleMarkerDragEnd}
        />
      </MapView>

      <View style={styles.coordinateRow}>
        <Text>Lat: {watch('latitude').toFixed(5)}</Text>
        <Text>Lng: {watch('longitude').toFixed(5)}</Text>
      </View>

      <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
        Submit report
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 16,
  },
  errorText: {
    color: '#d32f2f',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
