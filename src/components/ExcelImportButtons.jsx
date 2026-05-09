import { Button, Space, Upload } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

/**
 * @param {() => void} onDownloadTemplate
 * @param {(file: File) => void} onSelectFile — 請在內部自行 parse；return false 阻止 Upload 上傳
 * @param {boolean} [disabled]
 */
export default function ExcelImportButtons({
  onDownloadTemplate,
  onSelectFile,
  disabled = false,
  downloadText = '下載 Excel 範本',
  importText = 'Excel 匯入',
}) {
  return (
    <Space size="small">
      <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate} disabled={disabled}>
        {downloadText}
      </Button>
      <Upload
        accept=".xlsx,.xls"
        showUploadList={false}
        disabled={disabled}
        beforeUpload={(file) => {
          onSelectFile(file);
          return false;
        }}
      >
        <Button icon={<UploadOutlined />} disabled={disabled}>{importText}</Button>
      </Upload>
    </Space>
  );
}
