# DICOM Stream Handler Interface
This document describes the DICOM event-based Stream Handler Interface designed for SAX-style parsing of DICOM data. The purpose of this interface is to allow users to implement custom logic to handle and process DICOM data as it is being parsed, without the need to store the entire DICOM dataset in memory.

## Overview
The Content Handler Interface consists of a set of event methods that are called by the parser during the parsing process. Users implementing the custom logic should provide their own implementation for each of these event methods, which will be called by the parser as it encounters various elements of the DICOM data structure.

## Event Methods
The following event methods are part of the Content Handler Interface:

### onReset()
Called when the parser is reset.

#### Parameters: None

### onError(context, error)
Called when an error occurs during parsing.

#### Parameters:
error (object): An error object containing information about the encountered error.

### onStartInstance()
Called at the beginning of a new DICOM instance.

#### Parameters: None

#### Returns: 
- context (object): An custom implementor-specific context object containing any context data that the implementor needs in order to properly process a streaming instance session.

### onEndInstance(context)
Called at the end of a DICOM instance.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### Returns:
- instance (object): The instance parsed from the streaming instance session.

### onStartPreamble(context, preamble)
Called when the parser encounters the 128-byte preamble.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- preamble (object): An object that holds the 128-byte preamble data.

### onEndPreamble(context)
Called when the parser finishes processing the preamble.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onStartPrefix(context, prefix)
Called when the parser encounters the 4-byte prefix.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- prefix (object): An object that holds the 4-byte prefix data.

### onEndPrefix(context)
Called when the parser finishes processing the prefix.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onStartAttribute(context, attribute)
Called when the parser encounters a new attribute.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- attribute (object): An attribute object that hosts a "tag" field and a "data" field.

### onAppendAttribute(context, attribute)
Called when more data is available for the current attribute.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- attribute (object): The same attribute object instance that was passed to onStartAttribute, now with more data.

### onEndAttribute(context, attribute)
Called when the parser finishes processing an attribute.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- attribute (object): The same attribute object instance that was passed to onStartAttribute, now with complete data.

### onStartSequence(context, sequence)
Called when the parser encounters a new sequence.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- sequence (object): A sequence attribute object, derived from the attribute, representing a DICOM sequence.

### onEndSequence(context, sequence)
Called when the parser finishes processing a sequence.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.
- sequence (object): The same sequence object that was passed to onStartSequence, now with complete data.

### onStartItem(context)
Called when the parser encounters a new item within a sequence.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onEndItem(context)
Called when the parser finishes processing an item within a sequence.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onStartMetaSet(context)
Called at the beginning of the DICOM Meta Information Set.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onEndMetaSet(context)
Called at the end of the DICOM Meta Information Set.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onStartDataSet(context)
Called at the beginning of the DICOM Data Set.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

### onEndDataSet(context)
Called at the end of the DICOM Data Set.

#### Parameters:
- context (object): The same context object that was returned by the implementor from the onStartInstance event method.

Implementing the Custom Logic
When implementing the custom logic, users should provide their own implementation