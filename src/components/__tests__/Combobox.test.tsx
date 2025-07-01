import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from '@/components/ui/combobox';

const mockOptions = [
  { label: '苹果公司', value: 'AAPL' },
  { label: '微软公司', value: 'MSFT' },
  { label: '谷歌公司', value: 'GOOGL' },
];

describe('Combobox', () => {
  test('应该渲染基本的 combobox', () => {
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="选择股票..."
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('选择股票...')).toBeInTheDocument();
  });

  test('应该能够选择已有选项', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="选择股票..."
      />
    );

    // 点击打开下拉框
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // 等待选项出现
    await waitFor(() => {
      expect(screen.getByText('苹果公司')).toBeInTheDocument();
    });

    // 点击选择苹果公司
    await user.click(screen.getByText('苹果公司'));

    // 验证 onChange 被调用
    expect(mockOnChange).toHaveBeenCalledWith('AAPL');
  });

  test('应该支持搜索过滤', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="选择股票..."
      />
    );

    // 点击打开下拉框
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // 等待输入框出现
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
    });

    // 输入搜索内容
    const searchInput = screen.getByPlaceholderText('搜索...');
    await user.type(searchInput, '苹果');

    // 验证过滤结果
    await waitFor(() => {
      expect(screen.getByText('苹果公司')).toBeInTheDocument();
      expect(screen.queryByText('微软公司')).not.toBeInTheDocument();
    });
  });

  test('应该支持自定义输入', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="选择股票..."
        allowCustomInput={true}
        customInputPlaceholder="输入新股票..."
      />
    );

    // 点击打开下拉框
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // 等待输入框出现
    await waitFor(() => {
      expect(screen.getByPlaceholderText('输入新股票...')).toBeInTheDocument();
    });

    // 输入自定义内容
    const searchInput = screen.getByPlaceholderText('输入新股票...');
    await user.type(searchInput, '特斯拉');

    // 验证 onChange 被调用
    expect(mockOnChange).toHaveBeenCalledWith('特斯拉');
  });

  test('应该支持回车键确认自定义输入', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="选择股票..."
        allowCustomInput={true}
        customInputPlaceholder="输入新股票..."
      />
    );

    // 点击打开下拉框
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // 等待输入框出现
    await waitFor(() => {
      expect(screen.getByPlaceholderText('输入新股票...')).toBeInTheDocument();
    });

    // 输入自定义内容并按回车
    const searchInput = screen.getByPlaceholderText('输入新股票...');
    await user.type(searchInput, '特斯拉{enter}');

    // 验证 onChange 被调用
    expect(mockOnChange).toHaveBeenCalledWith('特斯拉');
  });

  test('应该显示选中的值', () => {
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value="AAPL"
        onChange={mockOnChange}
        placeholder="选择股票..."
      />
    );

    // 验证显示选中的标签
    expect(screen.getByText('苹果公司')).toBeInTheDocument();
  });

  test('应该显示自定义值', () => {
    const mockOnChange = jest.fn();
    
    render(
      <Combobox
        options={mockOptions}
        value="特斯拉"
        onChange={mockOnChange}
        placeholder="选择股票..."
      />
    );

    // 验证显示自定义值
    expect(screen.getByText('特斯拉')).toBeInTheDocument();
  });
});
