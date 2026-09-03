import { processAiImageRequest } from "../utils/aiImageGenerator.js";
import { processAiDocumentRequest } from "../utils/aiDocumentGenerator.js";

export const handleSpecialRequest = async ({
  specialType,
  specialBuffer,
  customProvider,
  targetModel,
  cleanPrompt,
  userId,
  session,
  res,
  customApiKey
}) => {
  if (specialType === "image") {
    return processAiImageRequest({
      imageReqBuffer: specialBuffer,
      customProvider,
      targetModel,
      cleanPrompt,
      userId,
      session,
      res,
      customApiKey
    });
  }
  if (specialType === "doc") {
    return processAiDocumentRequest({
      docReqBuffer: specialBuffer,
      userId,
      session,
      res
    });
  }
};

export default { handleSpecialRequest };
