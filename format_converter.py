import os
import re

# 定义文件路径
files_path = [
    "d:\\00同步文件\\00程序\\docs-xx\\docs\\03.考试\\在线练习\\第20套在线题目.md",
    "d:\\00同步文件\\00程序\\docs-xx\\docs\\03.考试\\在线练习\\第21套在线题目.md",
    "d:\\00同步文件\\00程序\\docs-xx\\docs\\03.考试\\在线练习\\第22套在线题目.md"
]

# 定义正则表达式模式
patterns = [
    # 匹配第一种格式：多行选项，使用大括号和方括号，带A.B.C.D.前缀
    (r'<MultipleChoiceQuestion\s+title="\【\d+\】(.*?)"\s+options=\{\[\s*"A\.(.*?)",\s*"B\.(.*?)",\s*"C\.(.*?)",\s*"D\.(.*?)"\s*\]\}\s+correctOptions=\{\[(\d+)\]\}\s+explanation="(.*?)"\s*/>', 
     r'<MultipleChoiceQuestion \
  title="\\1"\
  :options=["\\2", "\\3", "\\4", "\\5"]\
  :correctOptions="[\\6]"\
  explanation="\\7"\
/>'),
    
    # 匹配第二种格式：多行选项，使用方括号，带A.B.C.D.前缀
    (r'<MultipleChoiceQuestion\s+title="\【\d+\】(.*?)"\s+options=\[\s*"A\.(.*?)",\s*"B\.(.*?)",\s*"C\.(.*?)",\s*"D\.(.*?)"\s*\]\s+correctOptions=\{\[(\d+)\]\}\s+explanation="(.*?)"\s*/>', 
     r'<MultipleChoiceQuestion \
  title="\\1"\
  :options=["\\2", "\\3", "\\4", "\\5"]\
  :correctOptions="[\\6]"\
  explanation="\\7"\
/>'),
    
    # 匹配第三种格式：单行选项，使用方括号，带A.B.C.D.前缀
    (r'<MultipleChoiceQuestion\s+title="\【\d+\】(.*?)"\s+options=\[\s*"A\.(.*?)",\s*"B\.(.*?)",\s*"C\.(.*?)",\s*"D\.(.*?)"\s*\]\s+correctOptions=\[(\d+)\]\s+explanation="(.*?)"\s*/>', 
     r'<MultipleChoiceQuestion \
  title="\\1"\
  :options=["\\2", "\\3", "\\4", "\\5"]\
  :correctOptions="[\\6]"\
  explanation="\\7"\
/>'),
    
    # 匹配标题中带序号但选项格式不完整的情况
    (r'<MultipleChoiceQuestion\s+title="\【(\d+)\】(.*?)"', 
     r'<MultipleChoiceQuestion \
  title="\\2"')
]

# 处理每个文件
for file_path in files_path:
    # 读取文件内容
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 应用所有正则表达式模式
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # 进一步处理选项格式（如果还有剩余的A.B.C.D.前缀）
    content = re.sub(r':options=\["A\.(.*?)",\s*"B\.(.*?)",\s*"C\.(.*?)",\s*"D\.(.*?)"\]', r':options=["\1", "\2", "\3", "\4"]', content)
    
    # 统一组件属性格式
    content = re.sub(r'correctOptions=\{\[(\d+)\]\}', r':correctOptions="[\1]"', content)
    content = re.sub(r'options=\{\[(.*?)\]\}', r':options=[\1]', content)
    content = re.sub(r'options=\[(.*?)\]', r':options=[\1]', content)
    
    # 保存修改后的文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"已处理文件: {file_path}")

print("所有文件处理完成！")