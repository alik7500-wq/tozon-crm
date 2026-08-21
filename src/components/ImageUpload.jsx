import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../../api/axios';
import { AdvancedImage } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';
import { thumbnail } from '@cloudinary/url-gen/actions/resize';

// Initialize Cloudinary for displaying the uploaded image if needed
export const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'r3pnvm9s'
  }
});

const ImageUpload = ({ value, onChange, folder = 'general' }) => {
  const [loading, setLoading] = useState(false);

  const customRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // You can also pass folder if backend supports it
      
      const response = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        onChange(response.data.data.url);
        onSuccess(response.data.data);
        message.success('Изображение успешно загружено');
      } else {
        throw new Error(response.data?.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      message.error(`Ошибка загрузки: ${error.message}`);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Загрузить</div>
    </div>
  );

  return (
    <Upload
      name="image"
      listType="picture-card"
      className="image-uploader"
      showUploadList={false}
      customRequest={customRequest}
      accept="image/*"
    >
      {value ? (
        <img src={value} alt="uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        uploadButton
      )}
    </Upload>
  );
};

export default ImageUpload;
