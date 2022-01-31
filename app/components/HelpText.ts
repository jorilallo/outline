import styled from "styled-components";

const HelpText = styled.p<{ small?: boolean }>`
  margin-top: 0;
  color: ${(props) => props.theme.textSecondary};
  font-size: ${(props) => (props.small ? "14px" : "inherit")};
  word-break: break-all;
  white-space: normal;
`;

export default HelpText;
